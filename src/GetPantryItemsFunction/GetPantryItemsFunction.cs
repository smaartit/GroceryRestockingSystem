using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.Lambda.Serialization.SystemTextJson;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

[assembly: LambdaSerializer(typeof(DefaultLambdaJsonSerializer))]
namespace GetPantryItemsFunction;

public class GetPantryItemsFunction
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly DynamoDBContext _dbContext;

    public GetPantryItemsFunction()
    {
        // Setup DynamoDB client and context
        var client = new AmazonDynamoDBClient();
        _dbContext = new DynamoDBContext(client);
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
            // Scan all items from PantryItems table
            var scanConditions = new List<ScanCondition>();
            var items = await _dbContext.ScanAsync<PantryItem>(scanConditions).GetRemainingAsync();

            // Convert to response format
            var responseItems = items.Select(item => new
            {
                Id = item.Id,
                Name = item.Name,
                Category = item.Category,
                Quantity = item.Quantity,
                Price = item.Price,
                finished = false // Pantry items are not finished by default
            }).ToList();

            // Return success response
            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = System.Text.Json.JsonSerializer.Serialize(responseItems),
                Headers = corsHeaders
            };
        }
        catch (Exception ex)
        {
            // Handle errors and return error response
            context.Logger.LogLine($"Error getting pantry items: {ex.Message}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = "Failed to get pantry items",
                Headers = corsHeaders
            };
        }
    }

    [DynamoDBTable("PantryItems")]
    public class PantryItem
    {
        [DynamoDBHashKey] // The primary key for DynamoDB table
        public string Id { get; set; }

        [DynamoDBProperty]
        public string Name { get; set; }

        [DynamoDBProperty]
        public string Category { get; set; }

        [DynamoDBProperty]
        public int Quantity { get; set; }

        [DynamoDBProperty]
        public double Price { get; set; }
    }
}

