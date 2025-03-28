# Personalized Grocery Restocking System (Event Driven Architecture)

The **Personalized Grocery Restocking System** is designed to help individuals and families manage their grocery needs efficiently by sending reminders for restocking commonly used items (milk, bread, eggs, etc.) based on consumption patterns. It also suggests purchases based on personal preferences, seasonal changes, and past shopping behavior, ensuring that the user never runs out of essential items.

### **Key Features**

1. **Consumption Tracking**:
   - The system tracks the consumption of grocery items by monitoring user input (either manually through an app or automatically through IoT-connected devices like smart fridges).
   - It can track usage frequency and calculate when the user will likely run out of certain items.
2. **Smart Recommendations**:
   - Uses historical data, seasonal trends, and personal preferences to suggest grocery items that the user may want to buy.
   - For example, the system might suggest that the user order more soup ingredients during winter or snacks during movie nights.
3. **Automatic List Creation**:
   - As the system learns from user behavior, it automatically generates a shopping list of needed items based on consumption patterns (e.g., if the system notices that milk is consumed quickly, it will remind the user to buy it before it runs out).
   - Users can also add custom items to their list.
4. **Restock Alerts & Notifications**:
   - Sends **timely alerts** to remind users when it’s time to purchase commonly used items, ensuring they don't run out.
   - Alerts can be scheduled (e.g., weekly, monthly) or sent based on the depletion rate of an item (e.g., after consuming 80% of a carton of milk).
5. **Integration with Grocery Stores**:
   - The system can integrate with online grocery delivery services (e.g., Instacart, Amazon Fresh) to allow users to place orders directly from the app.
   - It can also show available discounts or offers on items the user frequently buys.
6. **Recurring Purchases & Subscriptions**:
   - Users can set up recurring purchases for frequently bought items (e.g., weekly vegetable delivery, monthly toilet paper).
   - The system can automatically order them for delivery on a set schedule.

---

### **Outbox Pattern Usage in the System**

The **Outbox Pattern** would be utilized to ensure reliable and consistent delivery of restocking alerts and event notifications without losing critical data. Here’s how it fits into the system design:

1. **Event Outbox Table**:
   - When a change occurs in the user’s grocery inventory (e.g., item usage, inventory updates, new shopping list items), the system writes an event to an **outbox table** in the database.
   - Example events:
     - `"ItemConsumed"` – When a user logs the consumption of an item.
     - `"RestockReminder"` – When it’s time to restock an item.
     - `"NewListGenerated"` – When the system auto-generates a new shopping list based on patterns.
2. **Event Processor (Background Worker)**:
   - A background worker scans the **outbox table** for unprocessed events (those with a `processed_at` field set to `NULL`).
   - It reads and publishes these events to an **event queue** (Kafka, RabbitMQ, etc.) for consumption by various services (e.g., push notification service, email alerting, etc.).
3. **Grocery Event Queue**:
   - The event processor publishes events to a sqs queue, ensuring that all alerts, recommendations, and reminders are delivered reliably to users, even if certain parts of the system are temporarily down or slow.
   - Example: A `"RestockReminder"` event will be queued for processing and sent as a push notification or email.
4. **Event Consumers**:
   - **Push Notification Service**: Sends a real-time notification to the user when it’s time to restock an item.
   - **Email Service**: Sends weekly or monthly summary emails with a list of items to buy or discounts available for frequently bought items.
   - **Grocery Ordering System**: Integrates with third-party delivery services to automatically process orders based on the user’s restocking events.

---

### **High-Level Architecture Diagram**

![alt text](<Screenshot 2025-03-28 at 2.01.34 pm.png>)

---

## **Event Flow Based on completed Architecture**

1️⃣ **User calls `/consume-item` API** → Stores an `"ItemConsumed"` event in **GroceryEventsTable**.

2️⃣ **DynamoDB Streams detects change** → Triggers `EventPublisher` Lambda.

3️⃣ **EventPublisher reads new events** → Publishes them to **GroceryEventsQueue (SQS)**.

4️⃣ **EventProcessor reads from SQS** → Publishes the event to SNS (sends notifications).
