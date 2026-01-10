import React, { useEffect, useState } from "react";
import { GroceryItem } from "../types";
import { getGroceryList, addItem, deleteGroceryListItem } from "../api";

interface ShoppingListProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showMessage: (message: string, type: "error" | "success") => void;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ loading, setLoading, showMessage }) => {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isRestocking, setIsRestocking] = useState<boolean>(false);

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

  const handleRestockSelected = async () => {
    if (checkedItems.size === 0) {
      showMessage("Please select items to restock", "error");
      return;
    }

    setIsRestocking(true);
    try {
      // Get all selected items
      const selectedItems = items.filter((item) => checkedItems.has(item.Id));
      
      // Restock each selected item (add to PantryItems)
      const restockPromises = selectedItems.map((item) =>
        addItem(
          item.Name,
          item.Category || "General",
          item.Quantity || 1
        )
      );

      await Promise.all(restockPromises);

      // Delete each selected item from GroceryList
      const deletePromises = selectedItems.map((item) =>
        deleteGroceryListItem(item.Id)
      );

      await Promise.all(deletePromises);

      const itemNames = selectedItems.map((item) => item.Name).join(", ");
      showMessage(`Successfully restocked: ${itemNames}`, "success");

      // Clear checked items
      setCheckedItems(new Set());

      // Refresh the grocery list to show updated list
      await fetchGroceryList();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to restock items";
      showMessage(errorMessage, "error");
    } finally {
      setIsRestocking(false);
    }
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
    <div>
      {checkedItems.size > 0 && (
        <div style={{ marginBottom: "20px", textAlign: "right" }}>
          <button
            className="btn btn-primary"
            onClick={handleRestockSelected}
            disabled={isRestocking || loading}
            style={{
              padding: "10px 20px",
              fontSize: "1rem",
              fontWeight: "500",
            }}
          >
            {isRestocking ? "Restocking..." : `Restock Selected (${checkedItems.size})`}
          </button>
        </div>
      )}
      <ul className="grocery-list">
        {items.map((item) => (
          <li key={item.Id} className="grocery-item">
            <input
              type="checkbox"
              className="item-checkbox"
              checked={checkedItems.has(item.Id)}
              onChange={() => handleCheckboxChange(item.Id)}
              disabled={isRestocking}
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
    </div>
  );
};

export default ShoppingList;

