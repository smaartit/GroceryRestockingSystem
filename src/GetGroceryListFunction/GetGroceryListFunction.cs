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
namespace GetGroceryListFunction;

public class GetGroceryListFunction
{
    // Static client to reuse across Lambda invocations (container reuse)
    private static readonly IAmazonDynamoDB _dynamoDbClient = new AmazonDynamoDBClient();
    
    // Cache for grocery list items (shared across invocations in the same container)
    private static List<Dictionary<string, object>>? _cachedItems = null;
    private static DateTime _cacheTimestamp = DateTime.MinValue;
    private static readonly TimeSpan _cacheExpiration = TimeSpan.FromSeconds(30); // Cache for 30 seconds
    
    public GetGroceryListFunction()
    {
        // Client is static, no need to initialize here
    }
    
    // Helper method to check if cache is still valid
    private static bool IsCacheValid()
    {
        return _cachedItems != null && 
               (DateTime.UtcNow - _cacheTimestamp) < _cacheExpiration;
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
            // Check if we have valid cached data
            if (IsCacheValid())
            {
                context.Logger.LogInformation($"Returning cached items (cached at {_cacheTimestamp:yyyy-MM-dd HH:mm:ss} UTC)");
                var cachedResponse = new APIGatewayProxyResponse
                {
                    StatusCode = 200,
                    Body = JsonSerializer.Serialize(_cachedItems),
                    Headers = corsHeaders
                };
                return cachedResponse;
            }
            
            var tableName = Environment.GetEnvironmentVariable("GROCERY_TABLE");
            context.Logger.LogInformation($"Cache expired or missing. Scanning table: {tableName}");
            
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
                        { "finished", false } // Items in shopping list are not checked by default
                    };
                    responseItems.Add(itemDict);
                }
                
                // Continue with next page if available
                scanRequest.ExclusiveStartKey = scanResponse.LastEvaluatedKey;
            } while (scanRequest.ExclusiveStartKey != null && scanRequest.ExclusiveStartKey.Count > 0);
            
            // Update cache with new data
            _cachedItems = responseItems;
            _cacheTimestamp = DateTime.UtcNow;
            
            context.Logger.LogInformation($"Retrieved {responseItems.Count} items from table and updated cache");

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
            context.Logger.LogLine($"Error getting grocery list items: {ex.Message}");
            context.Logger.LogLine($"Stack trace: {ex.StackTrace}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = $"Failed to get grocery list items: {ex.Message}",
                Headers = corsHeaders
            };
        }
    }
}

