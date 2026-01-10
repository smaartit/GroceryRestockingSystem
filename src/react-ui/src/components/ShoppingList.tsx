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
      
      console.log("Restocking items:", selectedItems.map(i => ({ name: i.Name, id: i.Id, qty: i.Quantity })));
      
      // Step 1: Restock each selected item (add to PantryItems)
      const restockResults = await Promise.allSettled(
        selectedItems.map((item) => {
          console.log(`Adding to pantry: ${item.Name} (Qty: ${item.Quantity || 1})`);
          return addItem(
            item.Name,
            item.Category || "General",
            item.Quantity || 1
          );
        })
      );

      // Check for failures in restocking
      const restockFailures = restockResults
        .map((result, index) => ({ result, item: selectedItems[index] }))
        .filter(({ result }) => result.status === "rejected");

      if (restockFailures.length > 0) {
        const failedItems = restockFailures.map(({ item }) => item.Name).join(", ");
        showMessage(`Failed to add to pantry: ${failedItems}`, "error");
        // Continue with deletion even if some restocks failed
      }

      // Step 2: Delete each selected item from GroceryList
      const deleteResults = await Promise.allSettled(
        selectedItems.map((item) => {
          console.log(`Deleting from grocery list: ${item.Name} (ID: ${item.Id})`);
          return deleteGroceryListItem(item.Id);
        })
      );

      // Check for failures in deletion
      const deleteFailures = deleteResults
        .map((result, index) => ({ result, item: selectedItems[index] }))
        .filter(({ result }) => result.status === "rejected");

      if (deleteFailures.length > 0) {
        const failedItems = deleteFailures.map(({ item }) => item.Name).join(", ");
        showMessage(`Failed to remove from grocery list: ${failedItems}`, "error");
      }

      // Show success message only if all operations succeeded
      const allRestocksSucceeded = restockFailures.length === 0;
      const allDeletesSucceeded = deleteFailures.length === 0;

      if (allRestocksSucceeded && allDeletesSucceeded) {
        const itemNames = selectedItems.map((item) => item.Name).join(", ");
        showMessage(`Successfully restocked: ${itemNames}`, "success");
      } else if (allRestocksSucceeded || allDeletesSucceeded) {
        showMessage("Partially completed. Some operations failed.", "error");
      }

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

