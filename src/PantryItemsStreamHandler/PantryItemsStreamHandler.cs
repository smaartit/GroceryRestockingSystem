using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.DynamoDBv2.Model;
using Amazon.Lambda.Core;
using Amazon.Lambda.DynamoDBEvents;
using Amazon.SQS;
using Amazon.SQS.Model;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]
namespace PantryItemsStreamHandler;

/// <summary>
/// Direct stream handler that updates GroceryList when PantryItems quantity decreases
/// This replaces the outbox pattern (EventPublisher -> SQS -> EventProcessor)
/// </summary>
public class PantryItemsStreamHandler
{
    private readonly IAmazonDynamoDB _dynamoDbClient;
    private readonly IAmazonSQS _sqsClient;
    private readonly string _groceryListTable;
    private readonly string? _dlqUrl;
    
    public PantryItemsStreamHandler()
    {
        _dynamoDbClient = new AmazonDynamoDBClient();
        _sqsClient = new AmazonSQSClient();
        _groceryListTable = Environment.GetEnvironmentVariable("GROCERY_TABLE") 
            ?? throw new InvalidOperationException("GROCERY_TABLE environment variable is not set");
        _dlqUrl = Environment.GetEnvironmentVariable("DLQ_URL");
    }

    public async Task FunctionHandler(DynamoDBEvent dynamoEvent, ILambdaContext context)
    {
        var failedRecords = new List<DynamoDBEvent.DynamodbStreamRecord>();
        
        foreach (var record in dynamoEvent.Records)
        {
            try
            {
                if (record.Dynamodb == null)
                {
                    context.Logger.LogInformation("Skipping record with no Dynamodb data");
                    continue;
                }

                // Get old and new images to detect quantity changes
                var oldImage = record.Dynamodb.OldImage;
                var newImage = record.Dynamodb.NewImage;

                // Skip if no new image (deletion events)
                if (newImage == null)
                {
                    context.Logger.LogInformation("Skipping record with no NewImage (likely a deletion)");
                    continue;
                }

                // Extract item details from the new image
                var itemId = newImage.ContainsKey("Id") ? newImage["Id"].S : null;
                var itemName = newImage.ContainsKey("Name") ? newImage["Name"].S : null;
                var category = newImage.ContainsKey("Category") ? newImage["Category"].S : "General";
                var newQuantity = newImage.ContainsKey("Quantity") && newImage["Quantity"].N != null
                    ? int.Parse(newImage["Quantity"].N)
                    : 0;

                // Check if quantity was decremented (item was consumed)
                int oldQuantity = 0;
                if (oldImage != null && oldImage.ContainsKey("Quantity") && oldImage["Quantity"].N != null)
                {
                    oldQuantity = int.Parse(oldImage["Quantity"].N);
                }

                // If quantity decreased (item was consumed/finished), add to GroceryList
                if (oldQuantity > newQuantity && !string.IsNullOrEmpty(itemName))
                {
                    int quantityToAdd = oldQuantity - newQuantity; // How many were consumed
                    
                    context.Logger.LogInformation(
                        $"Item '{itemName}' (ID: {itemId}) quantity decreased from {oldQuantity} to {newQuantity}. Adding {quantityToAdd} to GroceryList.");

                    // Retry logic with exponential backoff
                    bool success = await RetryWithBackoff(
                        async () => await AddOrUpdateGroceryListItem(itemName, category, quantityToAdd),
                        maxRetries: 3,
                        context);

                    if (!success)
                    {
                        context.Logger.LogError($"Failed to process record after retries. Item: {itemName}, ID: {itemId}");
                        failedRecords.Add(record);
                    }
                }
                else
                {
                    context.Logger.LogInformation(
                        $"Item '{itemName}' (ID: {itemId}) quantity change: {oldQuantity} -> {newQuantity}. No action needed (not a decrease).");
                }
            }
            catch (Exception ex)
            {
                context.Logger.LogError($"Error processing stream record: {ex.Message}");
                context.Logger.LogError($"Stack trace: {ex.StackTrace}");
                failedRecords.Add(record);
            }
        }

        // Send failed records to DLQ if configured
        if (failedRecords.Count > 0 && !string.IsNullOrEmpty(_dlqUrl))
        {
            await SendFailedRecordsToDLQ(failedRecords, context);
        }
    }

    private async Task<bool> RetryWithBackoff(Func<Task> action, int maxRetries, ILambdaContext context)
    {
        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                await action();
                return true;
            }
            catch (Exception ex)
            {
                context.Logger.LogWarning($"Attempt {attempt}/{maxRetries} failed: {ex.Message}");
                
                if (attempt < maxRetries)
                {
                    // Exponential backoff: 1s, 2s, 4s
                    int delayMs = (int)Math.Pow(2, attempt - 1) * 1000;
                    await Task.Delay(delayMs);
                }
                else
                {
                    context.Logger.LogError($"All {maxRetries} retry attempts failed");
                }
            }
        }
        return false;
    }

    private async Task SendFailedRecordsToDLQ(List<DynamoDBEvent.DynamodbStreamRecord> failedRecords, ILambdaContext context)
    {
        if (string.IsNullOrEmpty(_dlqUrl))
        {
            return;
        }

        try
        {
            foreach (var record in failedRecords)
            {
                var messageBody = JsonSerializer.Serialize(record);
                var request = new SendMessageRequest
                {
                    QueueUrl = _dlqUrl,
                    MessageBody = messageBody
                };
                
                await _sqsClient.SendMessageAsync(request);
                context.Logger.LogInformation($"Sent failed record to DLQ: {record.EventID}");
            }
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error sending failed records to DLQ: {ex.Message}");
        }
    }

    private async Task AddOrUpdateGroceryListItem(string itemName, string category, int quantityToAdd)
    {
        var groceryTable = Table.LoadTable(_dynamoDbClient, _groceryListTable);
        Document? existingGroceryItem = null;

        try
        {
            // Query GroceryList by Name using GSI
            var queryRequest = new QueryRequest
            {
                TableName = _groceryListTable,
                IndexName = "NameIndex",
                KeyConditionExpression = "#name = :name",
                ExpressionAttributeNames = new Dictionary<string, string>
                {
                    { "#name", "Name" }
                },
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    { ":name", new AttributeValue { S = itemName } }
                }
            };

            var queryResponse = await _dynamoDbClient.QueryAsync(queryRequest);
            
            if (queryResponse.Items != null && queryResponse.Items.Count > 0)
            {
                // Item exists, get the first match
                var item = queryResponse.Items[0];
                existingGroceryItem = Document.FromAttributeMap(item);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error querying GroceryList by Name: {ex.Message}. Will create new item.");
        }

        if (existingGroceryItem != null)
        {
            // Item exists, update quantity
            int currentQuantity = existingGroceryItem.ContainsKey("Quantity") 
                ? existingGroceryItem["Quantity"].AsInt() 
                : 0;
            
            existingGroceryItem["Quantity"] = currentQuantity + quantityToAdd;
            
            // Update category if not set
            if (!existingGroceryItem.ContainsKey("Category") || string.IsNullOrEmpty(existingGroceryItem["Category"].AsString()))
            {
                existingGroceryItem["Category"] = category;
            }

            await groceryTable.PutItemAsync(existingGroceryItem);
            Console.WriteLine($"Updated item '{itemName}' in GroceryList. New quantity: {existingGroceryItem["Quantity"].AsInt()}");
        }
        else
        {
            // Item doesn't exist, create new item
            var newGroceryItem = new Document
            {
                ["Id"] = Guid.NewGuid().ToString(),
                ["Name"] = itemName,
                ["Category"] = category,
                ["Quantity"] = quantityToAdd
            };

            await groceryTable.PutItemAsync(newGroceryItem);
            Console.WriteLine($"Created new item '{itemName}' in GroceryList with quantity {quantityToAdd}");
        }
    }
}

