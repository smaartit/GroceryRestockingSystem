using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.Lambda.Serialization.SystemTextJson;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

[assembly: LambdaSerializer(typeof(DefaultLambdaJsonSerializer))]
namespace AddItemFunction;

public class AddItemFunction
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly DynamoDBContext _dbContext;

    public AddItemFunction()
    {
        // Setup DynamoDB client and context
        var client = new AmazonDynamoDBClient();
        _dbContext = new DynamoDBContext(client);
    }

    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            // Parse the incoming request body
            var requestBody = request.Body;
            var item = System.Text.Json.JsonSerializer.Deserialize<GroceryItem>(requestBody);

            // Create a unique Id for the grocery item (e.g., GUID)
            item.Id = Guid.NewGuid().ToString();

            // Save the item to DynamoDB
            await _dbContext.SaveAsync(item);

            // Return success response
            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = $"Item '{item.Name}' added successfully",
                Headers = new Dictionary<string, string> { { "Content-Type", "application/json" } }
            };
        }
        catch (Exception ex)
        {
            // Handle errors and return error response
            context.Logger.LogLine($"Error adding item: {ex.Message}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = "Failed to add item",
                Headers = new Dictionary<string, string> { { "Content-Type", "application/json" } }
            };
        }
    }
    [DynamoDBTable("GroceryList")]
    public class GroceryItem
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
