import React, { useState } from "react";
import "./App.css";
import { GroceryItem, TabType, MessageType } from "./types";
import AddItems from "./components/AddItems";
import MarkAsFinished from "./components/MarkAsFinished";
import ShoppingList from "./components/ShoppingList";

// Mock data for demonstration - in production, you'd fetch from an API
const mockItems: GroceryItem[] = [
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

const App: React.FC = () => {
  const [items, setItems] = useState<GroceryItem[]>(mockItems);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("add");

  const showMessage = (message: string, type: MessageType): void => {
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
        <AddItems
          loading={loading}
          setLoading={setLoading}
          showMessage={showMessage}
        />
      )}

      {activeTab === "finish" && (
        <MarkAsFinished
          items={items}
          setItems={setItems}
          loading={loading}
          setLoading={setLoading}
          showMessage={showMessage}
        />
      )}

      {activeTab === "shopping" && (
        <ShoppingList items={items} loading={loading} />
      )}
    </div>
  );
};

export default App;
