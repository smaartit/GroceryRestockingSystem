using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.DynamoDBv2.Model;
using Amazon.Lambda.Core;
using Amazon.Lambda.SQSEvents;
using Amazon.SQS;
using Amazon.SimpleNotificationService;
using Amazon.SimpleNotificationService.Model;
using Amazon.Lambda.Serialization.Json;
using System;
using System.Collections.Generic;
using System.Linq;

[assembly: LambdaSerializer(typeof(JsonSerializer))]

namespace EventProcessor;

public class EventProcessor
{
    private readonly IAmazonDynamoDB _dynamoDbClient;
    private readonly IAmazonSQS _sqsClient;
    private readonly string _groceryListTable;
    private readonly string _groceryEventsTable;
    private readonly string _pantryItemsTable;
    private readonly string _snsTopicArn;

    public EventProcessor()
    {
        _dynamoDbClient = new AmazonDynamoDBClient();
        _sqsClient = new AmazonSQSClient();
        _groceryEventsTable = Environment.GetEnvironmentVariable("GROCERY_EVENTS_TABLE");
        _groceryListTable = Environment.GetEnvironmentVariable("GROCERY_TABLE");
        _pantryItemsTable = Environment.GetEnvironmentVariable("PANTRY_ITEMS_TABLE");
        _snsTopicArn = Environment.GetEnvironmentVariable("SNS_TOPIC_ARN");
    }

    public async Task FunctionHandler(SQSEvent sqsEvent, ILambdaContext context)
    {
        foreach (var record in sqsEvent.Records)
        {
            var eventData = System.Text.Json.JsonSerializer.Deserialize<GroceryEvent>(record.Body);
            var eventId = eventData.EventId;

            try
            {
                // Step 1: Retrieve event data from DynamoDB (GroceryEventsTable)
                var groceryEvent = await GetGroceryEvent(eventId);

                if (groceryEvent != null)
                {
                    // Step 2: Process the event (for example, update stock or trigger other actions)
                    await ProcessEvent(groceryEvent);

                    // Step 3: Optionally send a notification (e.g., via SNS)
                    await PublishNotification(groceryEvent);

                    Console.WriteLine($"Event with ID {eventId} successfully processed.");
                }
                else
                {
                    Console.WriteLine($"Event with ID {eventId} not found in DynamoDB.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing event {record.Body}: {ex.Message}");
            }
        }
    }

    private async Task<Document> GetGroceryEvent(string eventId)
    {
        // Query DynamoDB table to retrieve event data based on EventId
        var table = Table.LoadTable(_dynamoDbClient, _groceryEventsTable);
        var document = await table.GetItemAsync(eventId) ?? throw new Exception($"Event with ID {eventId} not found in DynamoDB");
        return document;
    }

    private async Task ProcessEvent(Document groceryEvent)
    {
        Console.WriteLine($"Processing event: {groceryEvent.ToJson()}");
        
        var eventPayload = groceryEvent["EventPayload"].AsString();
        var payload = System.Text.Json.JsonSerializer.Deserialize<GroceryItemPayload>(eventPayload);
        if (payload == null)
        {
            throw new ArgumentException("Invalid event payload.");
        }

        // Step 1: Get the item from PantryItems table to get its details
        var pantryTable = Table.LoadTable(_dynamoDbClient, _pantryItemsTable);
        var pantryItem = await pantryTable.GetItemAsync(payload.ItemId);
        
        if (pantryItem == null)
        {
            throw new Exception($"Item with ID {payload.ItemId} not found in PantryItems.");
        }

        string itemName = pantryItem.ContainsKey("Name") ? pantryItem["Name"].AsString() : payload.ItemName;
        string category = pantryItem.ContainsKey("Category") ? pantryItem["Category"].AsString() : "General";
        // When marking as finished, we add 1 item to the shopping list
        int quantityToAdd = 1;

        // Step 2: Check if item exists in GroceryList by Name using GSI
        var groceryTable = Table.LoadTable(_dynamoDbClient, _groceryListTable);
        Document existingGroceryItem = null;

        try
        {
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
            Console.WriteLine($"Error querying GroceryList by Name: {ex.Message}. Will try to create new item.");
        }

        // Step 3: Add or update item in GroceryList
        if (existingGroceryItem != null)
        {
            // Item exists, update quantity by adding the consumed quantity
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
            // Item doesn't exist, create new item with quantity 1
            var newGroceryItem = new Document
            {
                ["Id"] = Guid.NewGuid().ToString(),
                ["Name"] = itemName,
                ["Category"] = category,
                ["Quantity"] = quantityToAdd
            };

            await groceryTable.PutItemAsync(newGroceryItem);
            Console.WriteLine($"Created new item '{itemName}' in GroceryList with quantity: {quantityToAdd}");
        }

        // Step 4: Decrease quantity in PantryItems (optional - marking as consumed)
        if (pantryItem.ContainsKey("Quantity"))
        {
            int pantryQuantity = pantryItem["Quantity"].AsInt();
            pantryItem["Quantity"] = Math.Max(0, pantryQuantity - 1);
            await pantryTable.PutItemAsync(pantryItem);
            Console.WriteLine($"Decreased quantity in PantryItems for '{itemName}' to {pantryItem["Quantity"].AsInt()}");
        }
    }

    private async Task PublishNotification(Document groceryEvent)
    {
        // Optionally send a notification, e.g., via SNS
        var message = $"Event processed: {groceryEvent.ToJson()}";

        var snsClient = new AmazonSimpleNotificationServiceClient();
        var publishRequest = new PublishRequest
        {
            TopicArn = _snsTopicArn,
            Message = message
        };

        await snsClient.PublishAsync(publishRequest);
        Console.WriteLine($"Notification sent: {message}");
    }

    public class GroceryEvent
    {
        public string ItemId { get; set; }
        public string EventId { get; set; }
        public string EventType { get; set; }
        public string EventPayload { get; set; }
        public string CreatedAt { get; set; }
    }
    public class GroceryItemPayload
    {
        public string ItemId { get; set; }
        public string ItemName { get; set; }
    }
}
