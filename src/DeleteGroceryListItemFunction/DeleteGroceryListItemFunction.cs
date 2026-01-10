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
namespace DeleteGroceryListItemFunction;

public class DeleteGroceryListItemFunction
{
    // Static client to reuse across Lambda invocations (container reuse)
    private static readonly IAmazonDynamoDB _dynamoDbClient = new AmazonDynamoDBClient();
    
    public DeleteGroceryListItemFunction()
    {
        // Client is static, no need to initialize here
    }

    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var corsHeaders = new Dictionary<string, string>
        {
            { "Access-Control-Allow-Origin", "*" },
            { "Access-Control-Allow-Headers", "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token" },
            { "Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS" },
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
            // Get item ID from path parameters
            var pathParameters = request.PathParameters;
            if (pathParameters == null || !pathParameters.ContainsKey("id"))
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = 400,
                    Body = "Item ID is required",
                    Headers = corsHeaders
                };
            }

            var itemId = pathParameters["id"];
            if (string.IsNullOrEmpty(itemId))
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = 400,
                    Body = "Item ID cannot be empty",
                    Headers = corsHeaders
                };
            }

            var tableName = Environment.GetEnvironmentVariable("GROCERY_TABLE");
            
            // Delete the item from GroceryList
            var deleteRequest = new DeleteItemRequest
            {
                TableName = tableName,
                Key = new Dictionary<string, AttributeValue>
                {
                    { "Id", new AttributeValue { S = itemId } }
                }
            };

            await _dynamoDbClient.DeleteItemAsync(deleteRequest);

            // Return success response
            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = $"Item with ID '{itemId}' deleted successfully",
                Headers = corsHeaders
            };
        }
        catch (Exception ex)
        {
            // Handle errors and return error response
            context.Logger.LogLine($"Error deleting grocery list item: {ex.Message}");
            context.Logger.LogLine($"Stack trace: {ex.StackTrace}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = $"Failed to delete item: {ex.Message}",
                Headers = corsHeaders
            };
        }
    }
}

