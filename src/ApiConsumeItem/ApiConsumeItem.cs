using System;
using System.Text.Json;
using System.Threading.Tasks;
using System.Collections.Generic;
using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.DynamoDBv2.Model;

// Register the Lambda function handler
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace ApiConsumeItem;

public class ApiConsumeItem
{
    private readonly IAmazonDynamoDB _dynamoDbClient;
    private readonly string _pantryItemsTable;
    
    public ApiConsumeItem() : this(new AmazonDynamoDBClient()) { }
    
    public ApiConsumeItem(IAmazonDynamoDB dynamoDbClient)
    {
        _dynamoDbClient = dynamoDbClient ?? throw new ArgumentNullException(nameof(dynamoDbClient));
        _pantryItemsTable = Environment.GetEnvironmentVariable("PANTRY_ITEMS_TABLE") 
            ?? throw new InvalidOperationException("PANTRY_ITEMS_TABLE environment variable is not set");
    }

    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var corsHeaders = new Dictionary<string, string>
        {
            { "Access-Control-Allow-Origin", "*" },
            { "Access-Control-Allow-Headers", "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token" },
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
            context.Logger.LogInformation($"Received request: {request.Body}");
            if (string.IsNullOrWhiteSpace(request.Body))
            {
                context.Logger.LogError("Request body is empty.");
                return new APIGatewayProxyResponse
                {
                    StatusCode = 400,
                    Body = "Request body cannot be empty",
                    Headers = corsHeaders
                };
            }
            var item = JsonSerializer.Deserialize<ConsumeItemRequest>(request.Body, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (item == null)
            {
                context.Logger.LogError("Failed to deserialize request body.");
                return new APIGatewayProxyResponse
                {
                    StatusCode = 400,
                    Body = "Invalid request payload",
                    Headers = corsHeaders
                };
            }

            context.Logger.LogInformation($"Deserialized request: {JsonSerializer.Serialize(item)}");

            if (string.IsNullOrEmpty(item.ItemId))
            {
                context.Logger.LogError("ItemId is required");
                return new APIGatewayProxyResponse
                {
                    StatusCode = 400,
                    Body = "ItemId is required",
                    Headers = corsHeaders
                };
            }

            // Get the item from PantryItems table
            var pantryTable = Table.LoadTable(_dynamoDbClient, _pantryItemsTable);
            Document? pantryItem = null;
            
            try
            {
                pantryItem = await pantryTable.GetItemAsync(item.ItemId);
            }
            catch (Exception ex)
            {
                context.Logger.LogError($"Error retrieving item {item.ItemId} from PantryItems: {ex.Message}");
                return new APIGatewayProxyResponse
                {
                    StatusCode = 404,
                    Body = $"Item with ID '{item.ItemId}' not found",
                    Headers = corsHeaders
                };
            }

            if (pantryItem == null)
            {
                context.Logger.LogError($"Item with ID {item.ItemId} not found in PantryItems");
                return new APIGatewayProxyResponse
                {
                    StatusCode = 404,
                    Body = $"Item with ID '{item.ItemId}' not found",
                    Headers = corsHeaders
                };
            }

            // Decrement quantity by 1 (minimum 0)
            int currentQuantity = pantryItem.ContainsKey("Quantity") 
                ? pantryItem["Quantity"].AsInt() 
                : 0;
            
            pantryItem["Quantity"] = Math.Max(0, currentQuantity - 1);
            
            // Update the item in PantryItems (this will trigger the stream handler)
            await pantryTable.PutItemAsync(pantryItem);

            var itemName = pantryItem.ContainsKey("Name") ? pantryItem["Name"].AsString() : item.ItemName ?? "Unknown";
            context.Logger.LogInformation($"Decremented quantity for item '{itemName}' (ID: {item.ItemId}) to {pantryItem["Quantity"].AsInt()}");

            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = $"Item '{itemName}' consumption processed. Quantity: {pantryItem["Quantity"].AsInt()}",
                Headers = corsHeaders
            };
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error processing request: {ex.Message}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = "Internal server error",
                Headers = corsHeaders
            };
        }
    }
    public class ConsumeItemRequest
    {
        public string? ItemId { get; set; }
        public string? ItemName { get; set; }
    }
}
