using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.Lambda.Serialization.SystemTextJson;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;

[assembly: LambdaSerializer(typeof(DefaultLambdaJsonSerializer))]
namespace AddItemFunction;

public class AddItemFunction
{
    // Static client to reuse across Lambda invocations (container reuse)
    private static readonly IAmazonDynamoDB _dynamoDbClient = new AmazonDynamoDBClient();
    
    public AddItemFunction()
    {
        // Client is static, no need to initialize here
    }

    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var corsHeaders = new Dictionary<string, string>
        {
            { "Access-Control-Allow-Origin", "*" },
            { "Access-Control-Allow-Headers", "Content-Type,Authorization" },
            { "Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS" },
            { "Content-Type", "application/json" }
        };

        // Handle CORS preflight request
        if (request.HttpMethod == "OPTIONS")
        {
            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Headers = corsHeaders
            };
        }

        try
        {
            // Parse the incoming request body
            var requestBody = request.Body;
            var itemRequest = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(requestBody);

            if (itemRequest == null || !itemRequest.ContainsKey("Name"))
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = 400,
                    Body = "Item name is required",
                    Headers = corsHeaders
                };
            }

            var itemNameValue = itemRequest["Name"];
            if (itemNameValue.ValueKind != JsonValueKind.String)
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = 400,
                    Body = "Item name must be a string",
                    Headers = corsHeaders
                };
            }
            
            var itemName = itemNameValue.GetString();
            if (string.IsNullOrWhiteSpace(itemName))
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = 400,
                    Body = "Item name cannot be empty",
                    Headers = corsHeaders
                };
            }

            // Create a unique Id for the pantry item
            var itemId = Guid.NewGuid().ToString();
            
            // Parse other fields with defaults
            string category = "General";
            if (itemRequest.ContainsKey("Category") && itemRequest["Category"].ValueKind == JsonValueKind.String)
            {
                var categoryValue = itemRequest["Category"].GetString();
                if (!string.IsNullOrWhiteSpace(categoryValue))
                {
                    category = categoryValue;
                }
            }

            var quantity = itemRequest.ContainsKey("Quantity") && itemRequest["Quantity"].ValueKind == JsonValueKind.Number
                ? itemRequest["Quantity"].GetInt32()
                : 1;
            if (quantity <= 0)
            {
                quantity = 1;
            }

            var price = itemRequest.ContainsKey("Price") && itemRequest["Price"].ValueKind == JsonValueKind.Number
                ? itemRequest["Price"].GetDouble()
                : 0.0;

            var tableName = Environment.GetEnvironmentVariable("PANTRY_ITEMS_TABLE");
            
            // Check if an item with the same name and category already exists
            // Use GSI to query efficiently instead of scanning (much faster!)
            Dictionary<string, AttributeValue>? existingItem = null;
            try
            {
                var queryRequest = new QueryRequest
                {
                    TableName = tableName,
                    IndexName = "NameCategoryIndex",
                    KeyConditionExpression = "#name = :name AND #category = :category",
                    ExpressionAttributeNames = new Dictionary<string, string>
                    {
                        { "#name", "Name" },
                        { "#category", "Category" }
                    },
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                    {
                        { ":name", new AttributeValue { S = itemName.Trim() } },
                        { ":category", new AttributeValue { S = category } }
                    },
                    Limit = 1 // Only need one match
                };

                var queryResponse = await _dynamoDbClient.QueryAsync(queryRequest);
                
                if (queryResponse.Items != null && queryResponse.Items.Count > 0)
                {
                    existingItem = queryResponse.Items[0];
                }
            }
            catch (Exception ex)
            {
                // If GSI doesn't exist yet or query fails, fall back to creating new item
                context.Logger.LogWarning($"Query failed (GSI may not be ready): {ex.Message}. Will create new item.");
            }
            
            if (existingItem != null && existingItem.ContainsKey("Id"))
            {
                // Item exists, update its quantity
                var existingId = existingItem["Id"].S;
                
                // Update the existing item's quantity
                var updateRequest = new UpdateItemRequest
                {
                    TableName = tableName,
                    Key = new Dictionary<string, AttributeValue>
                    {
                        { "Id", new AttributeValue { S = existingId } }
                    },
                    UpdateExpression = "SET #quantity = :quantity, #price = :price",
                    ExpressionAttributeNames = new Dictionary<string, string>
                    {
                        { "#quantity", "Quantity" },
                        { "#price", "Price" }
                    },
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                    {
                        { ":quantity", new AttributeValue { N = quantity.ToString() } },
                        { ":price", new AttributeValue { N = price.ToString("F2") } }
                    }
                };

                await _dynamoDbClient.UpdateItemAsync(updateRequest);
                
                context.Logger.LogInformation($"Updated existing item '{itemName}' (ID: {existingId}) quantity to {quantity}");

                return new APIGatewayProxyResponse
                {
                    StatusCode = 200,
                    Body = $"Item '{itemName}' quantity updated to {quantity}",
                    Headers = corsHeaders
                };
            }
            else
            {
                // Item doesn't exist, create a new one
                var putRequest = new PutItemRequest
                {
                    TableName = tableName,
                    Item = new Dictionary<string, AttributeValue>
                    {
                        { "Id", new AttributeValue { S = itemId } },
                        { "Name", new AttributeValue { S = itemName } },
                        { "Category", new AttributeValue { S = category } },
                        { "Quantity", new AttributeValue { N = quantity.ToString() } },
                        { "Price", new AttributeValue { N = price.ToString("F2") } }
                    }
                };

                await _dynamoDbClient.PutItemAsync(putRequest);
                
                context.Logger.LogInformation($"Created new item '{itemName}' (ID: {itemId}) with quantity {quantity}");

                return new APIGatewayProxyResponse
                {
                    StatusCode = 200,
                    Body = $"Item '{itemName}' added successfully",
                    Headers = corsHeaders
                };
            }
        }
        catch (Exception ex)
        {
            // Handle errors and return error response
            context.Logger.LogLine($"Error adding item: {ex.Message}");
            context.Logger.LogLine($"Stack trace: {ex.StackTrace}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = $"Failed to add item: {ex.Message}",
                Headers = corsHeaders
            };
        }
    }
}
