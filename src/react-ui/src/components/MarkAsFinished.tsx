import React, { useEffect, useState } from "react";
import { GroceryItem, MessageType } from "../types";
import { consumeItem as apiConsumeItem, getPantryItems } from "../api";

interface MarkAsFinishedProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showMessage: (message: string, type: MessageType) => void;
}

const MarkAsFinished: React.FC<MarkAsFinishedProps> = ({
  loading,
  setLoading,
  showMessage,
}) => {
  const [items, setItems] = useState<GroceryItem[]>([]);

  // Fetch pantry items when component mounts
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const pantryItems = await getPantryItems();
        setItems(pantryItems);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Error fetching pantry items";
        showMessage(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [setLoading, showMessage]);

  const markAsFinished = async (item: GroceryItem): Promise<void> => {
    setLoading(true);

    try {
      await apiConsumeItem(item.Id, item.Name);

      showMessage(`"${item.Name}" marked as finished!`, "success");

      // Refresh the pantry items list after marking as finished
      const updatedItems = await getPantryItems();
      setItems(updatedItems);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error marking item as finished";
      showMessage(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading && items.length === 0) {
    return <div className="loading">Loading...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p>📦 No items in pantry yet.</p>
        <p>Add items to your pantry to get started!</p>
      </div>
    );
  }

  return (
    <ul className="grocery-list">
      {items.map((item) => (
        <li key={item.Id} className="grocery-item">
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
            </div>
          </div>
          <div className="item-actions">
            {item.Quantity > 0 && (
              <button
                className="action-button consume-button"
                onClick={() => markAsFinished(item)}
                disabled={loading}
              >
                Mark as Finished
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default MarkAsFinished;

