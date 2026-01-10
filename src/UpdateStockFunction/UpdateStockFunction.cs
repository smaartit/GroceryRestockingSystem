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
namespace UpdateStockFunction;

public class UpdateStockFunction
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly DynamoDBContext _dbContext;

    public UpdateStockFunction()
    {
        // Initialize DynamoDB client and context
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
            // Get item Id and new stock quantity from the request
            var pathParams = request.PathParameters;
            var itemId = pathParams["id"];
            var requestBody = request.Body;

            // Deserialize the request body to get the new stock quantity
            var stockUpdate = System.Text.Json.JsonSerializer.Deserialize<StockUpdate>(requestBody);

            // Fetch the existing item from DynamoDB
            var existingItem = await _dbContext.LoadAsync<GroceryItem>(itemId);

            if (existingItem == null)
            {
                // Return error if item not found
                return new APIGatewayProxyResponse
                {
                    StatusCode = 404,
                    Body = $"Item with Id '{itemId}' not found",
                    Headers = corsHeaders
                };
            }

            // Update the quantity of the existing item
            existingItem.Quantity = stockUpdate.Quantity;

            // Save the updated item back to DynamoDB
            await _dbContext.SaveAsync(existingItem);

            // Return success response
            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = $"Item '{existingItem.Name}' stock updated to {existingItem.Quantity}",
                Headers = corsHeaders
            };
        }
        catch (Exception ex)
        {
            // Handle errors and return error response
            context.Logger.LogLine($"Error updating stock: {ex.Message}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = "Failed to update stock",
                Headers = corsHeaders
            };
        }
    }

    [DynamoDBTable("GroceryList")]
    public class GroceryItem
    {
        [DynamoDBHashKey] // Primary key (Id)
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

    public class StockUpdate
    {
        public int Quantity { get; set; }
    }
}
