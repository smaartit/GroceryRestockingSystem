import React, { useState } from "react";
import "./App.css";
import { TabType, MessageType } from "./types";
import AddItems from "./components/AddItems";
import MarkAsFinished from "./components/MarkAsFinished";
import ShoppingList from "./components/ShoppingList";

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("add");

  const showMessage = (message: string, type: MessageType): void => {
    if (type === "error") {
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
    // Success messages are silently ignored (no banner display)
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
            Items in Pantry
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

      {activeTab === "add" && (
        <AddItems
          loading={loading}
          setLoading={setLoading}
          showMessage={showMessage}
        />
      )}

      {activeTab === "finish" && (
        <MarkAsFinished
          loading={loading}
          setLoading={setLoading}
          showMessage={showMessage}
        />
      )}

      {activeTab === "shopping" && (
        <ShoppingList
          loading={loading}
          setLoading={setLoading}
          showMessage={showMessage}
        />
      )}
    </div>
  );
};

export default App;
