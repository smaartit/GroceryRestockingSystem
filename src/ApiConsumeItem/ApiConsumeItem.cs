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
    private readonly string _outboxTableName;
    public ApiConsumeItem() : this(new AmazonDynamoDBClient()) { }
    public ApiConsumeItem(IAmazonDynamoDB dynamoDbClient)
    {
        _dynamoDbClient = dynamoDbClient ?? throw new ArgumentNullException(nameof(dynamoDbClient));
        _outboxTableName = Environment.GetEnvironmentVariable("OUTBOX_TABLE_NAME");
    }

    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var corsHeaders = new Dictionary<string, string>
        {
            { "Access-Control-Allow-Origin", "*" },
            { "Access-Control-Allow-Headers", "Content-Type,Authorization" },
            { "Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS" }
        };

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

            var eventId = Guid.NewGuid().ToString();
            var timestamp = DateTime.UtcNow.ToString("o");

            var putRequest = new PutItemRequest
            {
                TableName = _outboxTableName,
                Item = new Dictionary<string, AttributeValue>
                {
                    { "EventId", new AttributeValue { S = eventId } },
                    { "EventType", new AttributeValue { S = "ItemConsumed" } },
                    { "EventPayload", new AttributeValue { S = JsonSerializer.Serialize(item) } },
                    { "ProcessedAt", new AttributeValue { NULL = true } },
                    { "CreatedAt", new AttributeValue { S = timestamp } }
                }
            };

            await _dynamoDbClient.PutItemAsync(putRequest);

            context.Logger.LogInformation($"Event written to Outbox Table: {eventId}");

            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = "Item consumption event stored",
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
        public string ItemId { get; set; }
        public string ItemName { get; set; }
    }
}
