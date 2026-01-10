import React, { useState } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import "./App.css";
import { MessageType } from "./types";
import AddItems from "./components/AddItems";
import MarkAsFinished from "./components/MarkAsFinished";
import ShoppingList from "./components/ShoppingList";

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const location = useLocation();

  const showMessage = (message: string, type: MessageType): void => {
    if (type === "error") {
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
    // Success messages are silently ignored (no banner display)
  };

  const showProcessingMessage = (message: string): void => {
    setProcessingMessage(message);
  };

  const clearProcessingMessage = (): void => {
    setProcessingMessage(null);
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>🛒 Grocery Restocking</h1>
        <p>Track your groceries and never run out!</p>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <Link
            to="/additem"
            className={"nav-link" + (location.pathname === "/additem" ? " active" : "")}
          >
            Add Items
          </Link>
        </li>
        <li className="nav-item">
          <Link
            to="/pantry-list"
            className={"nav-link" + (location.pathname === "/pantry-list" || location.pathname === "/" ? " active" : "")}
          >
            Items in Pantry
          </Link>
        </li>
        <li className="nav-item">
          <Link
            to="/shopping-list"
            className={"nav-link" + (location.pathname === "/shopping-list" ? " active" : "")}
          >
            Shopping List
          </Link>
        </li>
      </ul>

      {error && <div className="error-message">{error}</div>}
      {processingMessage && (
        <div className="processing-message">
          <span className="processing-spinner">⏳</span> {processingMessage}
        </div>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/pantry-list" replace />} />
        <Route
          path="/additem"
          element={
            <AddItems
              loading={loading}
              setLoading={setLoading}
              showMessage={showMessage}
              showProcessingMessage={showProcessingMessage}
              clearProcessingMessage={clearProcessingMessage}
            />
          }
        />
        <Route
          path="/pantry-list"
          element={
            <MarkAsFinished
              loading={loading}
              setLoading={setLoading}
              showMessage={showMessage}
              showProcessingMessage={showProcessingMessage}
              clearProcessingMessage={clearProcessingMessage}
            />
          }
        />
        <Route
          path="/shopping-list"
          element={
            <ShoppingList
              loading={loading}
              setLoading={setLoading}
              showMessage={showMessage}
              showProcessingMessage={showProcessingMessage}
              clearProcessingMessage={clearProcessingMessage}
            />
          }
        />
      </Routes>
    </div>
  );
};

export default App;
