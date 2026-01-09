import React, { useState, useEffect } from 'react';
import './App.css';

// Default API base URL - should be replaced with actual API Gateway URL
const DEFAULT_API_BASE_URL = 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';

function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    return localStorage.getItem('apiBaseUrl') || DEFAULT_API_BASE_URL;
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    quantity: 1,
    price: 0
  });

  // Load API URL from localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('apiBaseUrl');
    if (savedUrl) {
      setApiBaseUrl(savedUrl);
    }
  }, []);

  // Save API URL to localStorage when changed
  const handleApiUrlChange = (e) => {
    const url = e.target.value;
    setApiBaseUrl(url);
    localStorage.setItem('apiBaseUrl', url);
  };

  const showMessage = (message, type) => {
    if (type === 'error') {
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
      showMessage('Please enter an item name', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Name: newItem.name,
          Category: newItem.category || 'General',
          Quantity: parseInt(newItem.quantity) || 1,
          Price: parseFloat(newItem.price) || 0
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to add item');
      }

      const result = await response.text();
      showMessage(result || 'Item added successfully!', 'success');
      
      // Reset form
      setNewItem({
        name: '',
        category: '',
        quantity: 1,
        price: 0
      });

      // Note: In a real app, you'd fetch the updated list here
      // For now, we'll just show the success message
    } catch (err) {
      showMessage(err.message || 'Error adding item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const consumeItem = async (item) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/consume-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.Id,
          itemName: item.Name
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to consume item');
      }

      showMessage(`"${item.Name}" marked as consumed!`, 'success');
      
      // Update local state to mark as finished
      setItems(items.map(i => 
        i.Id === item.Id 
          ? { ...i, finished: true, Quantity: Math.max(0, i.Quantity - 1) }
          : i
      ));
    } catch (err) {
      showMessage(err.message || 'Error consuming item', 'error');
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Quantity: newQuantity
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update item');
      }

      showMessage(`"${item.Name}" quantity updated!`, 'success');
      
      // Update local state
      setItems(items.map(i => 
        i.Id === item.Id 
          ? { ...i, Quantity: newQuantity, finished: false }
          : i
      ));
    } catch (err) {
      showMessage(err.message || 'Error updating item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (item) => {
    if (item.finished) {
      // If already finished, buy again
      buyAgain(item);
    } else {
      // If not finished, consume it
      consumeItem(item);
    }
  };

  // Mock data for demonstration - in production, you'd fetch from an API
  const mockItems = [
    { Id: '1', Name: 'Milk', Category: 'Dairy', Quantity: 2, Price: 3.99, finished: false },
    { Id: '2', Name: 'Bread', Category: 'Bakery', Quantity: 1, Price: 2.50, finished: false },
    { Id: '3', Name: 'Eggs', Category: 'Dairy', Quantity: 0, Price: 4.99, finished: true },
  ];

  // Use mock data if no items loaded (for demo purposes)
  const displayItems = items.length > 0 ? items : mockItems;

  return (
    <div className="app">
      <div className="app-header">
        <h1>🛒 Grocery Restocking</h1>
        <p>Track your groceries and never run out!</p>
      </div>

      <div className="api-config">
        <label>
          API Base URL:
          <input
            type="text"
            value={apiBaseUrl}
            onChange={handleApiUrlChange}
            placeholder="https://your-api.execute-api.us-east-1.amazonaws.com/prod"
          />
        </label>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

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
          onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
        />
        <input
          type="number"
          placeholder="Quantity"
          min="1"
          value={newItem.quantity}
          onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
        />
        <input
          type="number"
          placeholder="Price"
          min="0"
          step="0.01"
          value={newItem.price}
          onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
        />
        <button onClick={addItem} disabled={loading}>
          {loading ? 'Adding...' : 'Add Item'}
        </button>
      </div>

      {loading && items.length === 0 ? (
        <div className="loading">Loading...</div>
      ) : displayItems.length === 0 ? (
        <div className="empty-state">
          <p>📝 No items yet</p>
          <p>Add your first grocery item above!</p>
        </div>
      ) : (
        <ul className="grocery-list">
          {displayItems.map((item) => (
            <li
              key={item.Id}
              className={`grocery-item ${item.finished ? 'finished' : ''}`}
            >
              <input
                type="checkbox"
                className="item-checkbox"
                checked={item.finished}
                onChange={() => handleCheckboxChange(item)}
                disabled={loading}
              />
              <div className="item-info">
                <span className="item-name">{item.Name}</span>
                <div className="item-details">
                  {item.Category && (
                    <span className="item-category">📁 {item.Category}</span>
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
                  {item.Price > 0 && (
                    <span className="item-price">💰 ${item.Price.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="item-actions">
                {!item.finished && item.Quantity > 0 && (
                  <button
                    className="action-button consume-button"
                    onClick={() => consumeItem(item)}
                    disabled={loading}
                  >
                    Consume
                  </button>
                )}
                {item.finished && (
                  <button
                    className="action-button buy-again-button"
                    onClick={() => buyAgain(item)}
                    disabled={loading}
                  >
                    Buy Again
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;

