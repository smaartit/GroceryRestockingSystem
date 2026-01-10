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
namespace GetPantryItemsFunction;

public class GetPantryItemsFunction
{
    // Static client to reuse across Lambda invocations (container reuse)
    private static readonly IAmazonDynamoDB _dynamoDbClient = new AmazonDynamoDBClient();
    
    public GetPantryItemsFunction()
    {
        // Client is static, no need to initialize here
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
            var tableName = Environment.GetEnvironmentVariable("PANTRY_ITEMS_TABLE");
            context.Logger.LogInformation($"Scanning table: {tableName}");
            
            // Use low-level DynamoDB client for better performance
            // Scan with pagination to handle large tables efficiently
            var responseItems = new List<Dictionary<string, object>>();
            var scanRequest = new ScanRequest
            {
                TableName = tableName,
                Limit = 100 // Process in batches of 100 items
            };
            
            do
            {
                var scanResponse = await _dynamoDbClient.ScanAsync(scanRequest);
                
                // Process each item in the batch
                foreach (var item in scanResponse.Items)
                {
                    var itemDict = new Dictionary<string, object>
                    {
                        { "Id", item.ContainsKey("Id") && item["Id"].S != null ? item["Id"].S : "" },
                        { "Name", item.ContainsKey("Name") && item["Name"].S != null ? item["Name"].S : "" },
                        { "Category", item.ContainsKey("Category") && item["Category"].S != null ? item["Category"].S : "" },
                        { "Quantity", item.ContainsKey("Quantity") && item["Quantity"].N != null ? int.Parse(item["Quantity"].N) : 0 },
                        { "Price", item.ContainsKey("Price") && item["Price"].N != null ? double.Parse(item["Price"].N) : 0.0 },
                        { "finished", false } // Pantry items are not finished by default
                    };
                    responseItems.Add(itemDict);
                }
                
                // Continue with next page if available
                scanRequest.ExclusiveStartKey = scanResponse.LastEvaluatedKey;
            } while (scanRequest.ExclusiveStartKey != null && scanRequest.ExclusiveStartKey.Count > 0);
            
            context.Logger.LogInformation($"Retrieved {responseItems.Count} items from table");

            // Return success response with CORS headers
            var response = new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = JsonSerializer.Serialize(responseItems),
                Headers = corsHeaders
            };
            
            // Ensure headers are set
            if (response.Headers == null)
            {
                response.Headers = corsHeaders;
            }
            
            return response;
        }
        catch (Exception ex)
        {
            // Handle errors and return error response
            context.Logger.LogLine($"Error getting pantry items: {ex.Message}");
            context.Logger.LogLine($"Stack trace: {ex.StackTrace}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = $"Failed to get pantry items: {ex.Message}",
                Headers = corsHeaders
            };
        }
    }
}

