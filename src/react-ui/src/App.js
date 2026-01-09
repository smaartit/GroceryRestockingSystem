import React, { useState } from "react";
import "./App.css";

const DEFAULT_API_BASE_URL =
  "https://g9orskr1ab.execute-api.us-east-1.amazonaws.com/prod";

// Mock data for demonstration - in production, you'd fetch from an API
const mockItems = [
  {
    Id: "1",
    Name: "Milk",
    Category: "Dairy",
    Quantity: 2,
    finished: false,
  },
  {
    Id: "2",
    Name: "Bread",
    Category: "Bakery",
    Quantity: 1,
    finished: false,
  },
  {
    Id: "3",
    Name: "Eggs",
    Category: "Dairy",
    Quantity: 0,
    finished: true,
  },
];

function App() {
  const [items, setItems] = useState(mockItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    quantity: 1,
  });
  const [activeTab, setActiveTab] = useState("add"); // 'add' | 'finish' | 'shopping'

  const apiBaseUrl = DEFAULT_API_BASE_URL;

  const showMessage = (message, type) => {
    if (type === "error") {
      setError(message);
      setSuccess(null);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccess(message);
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const addItem = async () => {
    if (!newItem.name.trim()) {
      showMessage("Please enter an item name", "error");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Name: newItem.name,
          Category: newItem.category || "General",
          Quantity: parseInt(newItem.quantity) || 1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to add item");
      }

      const result = await response.text();
      showMessage(result || "Item added successfully!", "success");

      // Reset form
      setNewItem({
        name: "",
        category: "",
        quantity: 1,
      });

      // Note: In a real app, you'd fetch the updated list here
      // For now, we'll just show the success message
    } catch (err) {
      showMessage(err.message || "Error adding item", "error");
    } finally {
      setLoading(false);
    }
  };

  const markAsFinished = async (item) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/consume-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: item.Id,
          itemName: item.Name,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to mark item as finished");
      }

      showMessage(`"${item.Name}" marked as finished!`, "success");

      // Update local state to mark as finished
      setItems(
        items.map((i) =>
          i.Id === item.Id
            ? { ...i, finished: true, Quantity: Math.max(0, i.Quantity - 1) }
            : i
        )
      );
    } catch (err) {
      showMessage(err.message || "Error marking item as finished", "error");
    } finally {
      setLoading(false);
    }
  };

  const buyAgain = async (item) => {
    setLoading(true);
    setError(null);

    try {
      const newQuantity = (item.Quantity || 0) + 1;

      const response = await fetch(`${apiBaseUrl}/items/${item.Id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Quantity: newQuantity,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update item");
      }

      showMessage(`"${item.Name}" quantity updated!`, "success");

      // Update local state
      setItems(
        items.map((i) =>
          i.Id === item.Id
            ? { ...i, Quantity: newQuantity, finished: false }
            : i
        )
      );
    } catch (err) {
      showMessage(err.message || "Error updating item", "error");
    } finally {
      setLoading(false);
    }
  };

  const finishedItems = items.filter((i) => i.finished);
  const unfinishedItems = items.filter((i) => !i.finished);

  return (
    <div className="app">
      <div className="app-header">
        <h1>🛒 Grocery Restocking</h1>
        <p>Track your groceries and never run out!</p>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={"nav-link" + (activeTab === "add" ? " active" : "")}
            onClick={() => setActiveTab("add")}
          >
            Add Items
          </button>
        </li>
        <li className="nav-item">
          <button
            className={"nav-link" + (activeTab === "finish" ? " active" : "")}
            onClick={() => setActiveTab("finish")}
          >
            Mark as Finished
          </button>
        </li>
        <li className="nav-item">
          <button
            className={"nav-link" + (activeTab === "shopping" ? " active" : "")}
            onClick={() => setActiveTab("shopping")}
          >
            Shopping List
          </button>
        </li>
      </ul>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {activeTab === "add" && (
        <div className="add-item-form">
          <input
            type="text"
            placeholder="Item name (e.g., Milk)"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Category (optional)"
            value={newItem.category}
            onChange={(e) =>
              setNewItem({ ...newItem, category: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Quantity"
            min="1"
            value={newItem.quantity}
            onChange={(e) =>
              setNewItem({ ...newItem, quantity: e.target.value })
            }
          />
          <button onClick={addItem} disabled={loading}>
            {loading ? "Adding..." : "Add Item"}
          </button>
        </div>
      )}

      {activeTab === "finish" && (
        <>
          {loading && unfinishedItems.length === 0 ? (
            <div className="loading">Loading...</div>
          ) : unfinishedItems.length === 0 ? (
            <div className="empty-state">
              <p>✅ All items are finished!</p>
            </div>
          ) : (
            <ul className="grocery-list">
              {unfinishedItems.map((item) => (
                <li key={item.Id} className="grocery-item">
                  <div className="item-info">
                    <span className="item-name">{item.Name}</span>
                    <div className="item-details">
                      {item.Category && (
                        <span className="item-category">
                          📁 {item.Category}
                        </span>
                      )}
                      <span className="item-quantity">
                        Quantity:
                        <input
                          type="number"
                          className="quantity-input"
                          value={item.Quantity || 0}
                          readOnly
                        />
                      </span>
                    </div>
                  </div>
                  <div className="item-actions">
                    {item.Quantity > 0 && (
                      <button
                        className="action-button consume-button"
                        onClick={() => markAsFinished(item)}
                        disabled={loading}
                      >
                        Finished
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {activeTab === "shopping" && (
        <>
          {loading && finishedItems.length === 0 ? (
            <div className="loading">Loading...</div>
          ) : finishedItems.length === 0 ? (
            <div className="empty-state">
              <p>No finished items yet.</p>
              <p>Mark items as finished to build your shopping list.</p>
            </div>
          ) : (
            <ul className="grocery-list">
              {finishedItems.map((item) => (
                <li key={item.Id} className="grocery-item">
                  <input
                    type="checkbox"
                    className="item-checkbox"
                    checked={true}
                    readOnly
                  />
                  <div className="item-info">
                    <span className="item-name">{item.Name}</span>
                    <div className="item-details">
                      {item.Category && (
                        <span className="item-category">
                          📁 {item.Category}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default App;
