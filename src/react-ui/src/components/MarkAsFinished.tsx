import React from "react";
import { GroceryItem, MessageType } from "../types";
import { consumeItem as apiConsumeItem } from "../api";

interface MarkAsFinishedProps {
  items: GroceryItem[];
  setItems: React.Dispatch<React.SetStateAction<GroceryItem[]>>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showMessage: (message: string, type: MessageType) => void;
}

const MarkAsFinished: React.FC<MarkAsFinishedProps> = ({
  items,
  setItems,
  loading,
  setLoading,
  showMessage,
}) => {
  const unfinishedItems = items.filter((i) => !i.finished);

  const markAsFinished = async (item: GroceryItem): Promise<void> => {
    setLoading(true);

    try {
      await apiConsumeItem(item.Id, item.Name);

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
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error marking item as finished";
      showMessage(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading && unfinishedItems.length === 0) {
    return <div className="loading">Loading...</div>;
  }

  if (unfinishedItems.length === 0) {
    return (
      <div className="empty-state">
        <p>✅ All items are finished!</p>
      </div>
    );
  }

  return (
    <ul className="grocery-list">
      {unfinishedItems.map((item) => (
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
                Finished
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default MarkAsFinished;

