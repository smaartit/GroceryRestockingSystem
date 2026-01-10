import React from "react";
import { GroceryItem } from "../types";

interface ShoppingListProps {
  items: GroceryItem[];
  loading: boolean;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ items, loading }) => {
  const finishedItems = items.filter((i) => i.finished);

  if (loading && finishedItems.length === 0) {
    return <div className="loading">Loading...</div>;
  }

  if (finishedItems.length === 0) {
    return (
      <div className="empty-state">
        <p>No finished items yet.</p>
        <p>Mark items as finished to build your shopping list.</p>
      </div>
    );
  }

  return (
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
                <span className="item-category">📁 {item.Category}</span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ShoppingList;

