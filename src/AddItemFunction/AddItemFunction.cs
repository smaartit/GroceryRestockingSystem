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
            
            // Use low-level DynamoDB client for better performance
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

            // Return success response
            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = $"Item '{itemName}' added successfully",
                Headers = corsHeaders
            };
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
