using Amazon.Lambda.Core;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.SQS;
using Amazon.SQS.Model;
using Amazon.Lambda.DynamoDBEvents;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]
namespace EventPublisher;

public class EventPublisher
{
    private readonly IAmazonDynamoDB _dynamoDbClient;
    private readonly IAmazonSQS _sqsClient;
    private readonly string _groceryEventsTable;
    private readonly string _groceryEventsQueueUrl;
    public EventPublisher()
    {
        _dynamoDbClient = new AmazonDynamoDBClient();
        _sqsClient = new AmazonSQSClient();
        _groceryEventsTable = Environment.GetEnvironmentVariable("GROCERY_EVENTS_TABLE");
        _groceryEventsQueueUrl = Environment.GetEnvironmentVariable("SQS_QUEUE_URL");
    }
    public async Task FunctionHandler(DynamoDBEvent dynamoEvent, ILambdaContext context)
    {
        try
        {
            Console.WriteLine("Start processing records...");
            foreach (var record in dynamoEvent.Records)
            {
                Console.WriteLine($"Processing record: {JsonSerializer.Serialize(record)}");
                if (record == null || record.Dynamodb == null)
                {
                    context.Logger.LogError("Stream record is invalid or empty.");
                    return;
                }

                if (record.Dynamodb.NewImage == null)
                {
                    Console.WriteLine("fail Stream record is invalid or empty - Missing NewImage");
                    continue;
                }

                var eventId = record.Dynamodb.NewImage["EventId"].S;
                var itemName = GetItemName(record);

                if (string.IsNullOrEmpty(eventId))
                {
                    context.Logger.LogError("EventId is missing in the stream record.");
                    return;
                }
                Console.WriteLine($"Processing event: {eventId}, Item: {itemName}");
                // Retrieve the event data from DynamoDB based on the eventId
                var groceryEvent = await GetGroceryEvent(eventId, context);

                if (groceryEvent == null)
                {
                    context.Logger.LogError($"No event data found in DynamoDB for EventId: {eventId}");
                    return;
                }
                // Send event data to SQS
                await SendMessageToSqs(groceryEvent, context);

                Console.WriteLine($"Sent event {eventId} to SQS.");
            }
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error processing event: {ex.Message}");
        }
    }

    private static string GetItemName(DynamoDBEvent.DynamodbStreamRecord record)
    {
        var itemName = string.Empty;
        if (record.Dynamodb.NewImage.TryGetValue("EventPayload", out var eventPayloadAttribute))
        {
            var eventPayloadJson = eventPayloadAttribute.S;
            var eventPayload = JsonSerializer.Deserialize<Dictionary<string, object>>(eventPayloadJson);

            if (eventPayload.TryGetValue("ItemName", out var itemNameObj))
            {
                itemName = itemNameObj.ToString();
                Console.WriteLine($"Extracted ItemName: {itemName}");

                return itemName;
            }
            else
            {
                Console.WriteLine("fail: ItemName not found in EventPayload");
            }
        }
        else
        {
            Console.WriteLine("fail: EventPayload field not found in NewImage");
        }
        return itemName;
    }

    private async Task<Document> GetGroceryEvent(string eventId, ILambdaContext context)
    {
        try
        {
            var table = Table.LoadTable(_dynamoDbClient, _groceryEventsTable);
            var document = await table.GetItemAsync(eventId);

            if (document == null)
            {
                context.Logger.LogError($"Event with EventId {eventId} not found in DynamoDB.");
            }

            return document;
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error retrieving event from DynamoDB: {ex.Message}");
            throw;
        }
    }

    private async Task SendMessageToSqs(Document groceryEvent, ILambdaContext context)
    {
        try
        {
            var messageBody = groceryEvent.ToJson();

            var sendMessageRequest = new SendMessageRequest
            {
                QueueUrl = _groceryEventsQueueUrl,
                MessageBody = messageBody
            };

            await _sqsClient.SendMessageAsync(sendMessageRequest);
            context.Logger.LogInformation($"Successfully sent event with ID {groceryEvent["EventId"]} to SQS.");
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error sending event to SQS: {ex.Message}");
            throw;
        }
    }
}