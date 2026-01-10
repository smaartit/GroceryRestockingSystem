import React, { useEffect, useState } from "react";
import { GroceryItem } from "../types";
import { getGroceryList } from "../api";

interface ShoppingListProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showMessage: (message: string, type: "error" | "success") => void;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ loading, setLoading, showMessage }) => {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGroceryList();
  }, []);

  const fetchGroceryList = async () => {
    setLoading(true);
    try {
      const groceryItems = await getGroceryList();
      setItems(groceryItems);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load grocery list";
      showMessage(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (itemId: string) => {
    setCheckedItems((prev) => {
      const newChecked = new Set(prev);
      if (newChecked.has(itemId)) {
        newChecked.delete(itemId);
      } else {
        newChecked.add(itemId);
      }
      return newChecked;
    });
  };

  if (loading && items.length === 0) {
    return <div className="loading">Loading...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p>No items in your shopping list yet.</p>
        <p>Mark items as finished to add them to your shopping list.</p>
      </div>
    );
  }

  return (
    <ul className="grocery-list">
      {items.map((item) => (
        <li key={item.Id} className="grocery-item">
          <input
            type="checkbox"
            className="item-checkbox"
            checked={checkedItems.has(item.Id)}
            onChange={() => handleCheckboxChange(item.Id)}
          />
          <div className="item-info">
            <span className="item-name">{item.Name}</span>
            <div className="item-details">
              {item.Category && (
                <span className="item-category">📁 {item.Category}</span>
              )}
              {item.Quantity > 0 && (
                <span className="item-quantity">Qty: {item.Quantity}</span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ShoppingList;

