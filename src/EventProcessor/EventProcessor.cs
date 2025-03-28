using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Lambda.Core;
using Amazon.Lambda.SQSEvents;
using Amazon.SQS;
using Amazon.SimpleNotificationService;
using Amazon.SimpleNotificationService.Model;
using Amazon.Lambda.Serialization.Json;

[assembly: LambdaSerializer(typeof(JsonSerializer))]

namespace EventProcessor;

public class EventProcessor
{
    private readonly IAmazonDynamoDB _dynamoDbClient;
    private readonly IAmazonSQS _sqsClient;
    private readonly string _groceryListTable;
    private readonly string _groceryEventsTable;
    private readonly string _snsTopicArn;

    public EventProcessor()
    {
        _dynamoDbClient = new AmazonDynamoDBClient();
        _sqsClient = new AmazonSQSClient();
        _groceryEventsTable = Environment.GetEnvironmentVariable("GROCERY_EVENTS_TABLE");
        _groceryListTable = Environment.GetEnvironmentVariable("GROCERY_TABLE");
        _snsTopicArn = Environment.GetEnvironmentVariable("SNS_TOPIC_ARN");
    }

    public async Task FunctionHandler(SQSEvent sqsEvent, ILambdaContext context)
    {
        foreach (var record in sqsEvent.Records)
        {
            var eventData = System.Text.Json.JsonSerializer.Deserialize<GroceryEvent>(record.Body);
            var eventId = eventData.EventId;

            try
            {
                // Step 1: Retrieve event data from DynamoDB (GroceryEventsTable)
                var groceryEvent = await GetGroceryEvent(eventId);

                if (groceryEvent != null)
                {
                    // Step 2: Process the event (for example, update stock or trigger other actions)
                    await ProcessEvent(groceryEvent);

                    // Step 3: Optionally send a notification (e.g., via SNS)
                    await PublishNotification(groceryEvent);

                    Console.WriteLine($"Event with ID {eventId} successfully processed.");
                }
                else
                {
                    Console.WriteLine($"Event with ID {eventId} not found in DynamoDB.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing event {record.Body}: {ex.Message}");
            }
        }
    }

    private async Task<Document> GetGroceryEvent(string eventId)
    {
        // Query DynamoDB table to retrieve event data based on EventId
        var table = Table.LoadTable(_dynamoDbClient, _groceryEventsTable);
        var document = await table.GetItemAsync(eventId) ?? throw new Exception($"Event with ID {eventId} not found in DynamoDB");
        return document;
    }

    private async Task ProcessEvent(Document groceryEvent)
    {
        Console.WriteLine($"Processing event: {groceryEvent.ToJson()}");
        var table = Table.LoadTable(_dynamoDbClient, _groceryListTable);


        var eventPayload = groceryEvent["EventPayload"].AsString();
        var payload = System.Text.Json.JsonSerializer.Deserialize<GroceryItemPayload>(eventPayload);
        if (payload == null)
        {
            throw new ArgumentException("Invalid event payload.");
        }

        var document = await table.GetItemAsync(payload.ItemId);
        if (document == null)
        {
            throw new Exception($"Item with ID {payload.ItemId} not found in GroceryList.");
        }
        if (document.ContainsKey("Quantity") && document["Quantity"].AsInt() > 0)
        {
            int currentQuantity = document["Quantity"].AsInt();

            // Decrease quantity by 1 (ensure it doesn't go below 0)
            document["Quantity"] = Math.Max(0, currentQuantity - 1);
        }

        await table.PutItemAsync(document);
    }

    private async Task PublishNotification(Document groceryEvent)
    {
        // Optionally send a notification, e.g., via SNS
        var message = $"Event processed: {groceryEvent.ToJson()}";

        var snsClient = new AmazonSimpleNotificationServiceClient();
        var publishRequest = new PublishRequest
        {
            TopicArn = _snsTopicArn,
            Message = message
        };

        await snsClient.PublishAsync(publishRequest);
        Console.WriteLine($"Notification sent: {message}");
    }

    public class GroceryEvent
    {
        public string ItemId { get; set; }
        public string EventId { get; set; }
        public string EventType { get; set; }
        public string EventPayload { get; set; }
        public string CreatedAt { get; set; }
    }
    public class GroceryItemPayload
    {
        public string ItemId { get; set; }
        public string ItemName { get; set; }
    }
}
