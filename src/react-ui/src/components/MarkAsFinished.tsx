import React, { useEffect, useState } from "react";
import { GroceryItem, MessageType } from "../types";
import { consumeItem as apiConsumeItem, getPantryItems, addItem as apiAddItem } from "../api";
import { getCategoryIcon } from "../utils/categoryIcons";

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
  const [allPantryItems, setAllPantryItems] = useState<GroceryItem[]>([]);
  const [markingItems, setMarkingItems] = useState<Set<string>>(new Set());
  const [updatingQuantities, setUpdatingQuantities] = useState<Set<string>>(new Set());

  // Helper function to combine items with the same name
  const combineItems = (items: GroceryItem[]): GroceryItem[] => {
    const combinedMap = new Map<string, GroceryItem>();

    items.forEach((item) => {
      const itemName = item.Name.toLowerCase().trim();
      const existing = combinedMap.get(itemName);

      if (existing) {
        // Combine quantities
        existing.Quantity = (existing.Quantity || 0) + (item.Quantity || 0);
        // Keep the first category found, or merge if different
        if (!existing.Category && item.Category) {
          existing.Category = item.Category;
        }
      } else {
        // Create a new entry with a combined ID for reference
        combinedMap.set(itemName, {
          ...item,
          Id: item.Id, // Keep the first item's ID for marking as finished
        });
      }
    });

    // Convert to array and sort alphabetically by name
    return Array.from(combinedMap.values()).sort((a, b) => {
      const nameA = a.Name.toLowerCase().trim();
      const nameB = b.Name.toLowerCase().trim();
      return nameA.localeCompare(nameB);
    });
  };

  // Helper function to group items by category
  const groupItemsByCategory = (items: GroceryItem[]): Record<string, GroceryItem[]> => {
    const grouped: Record<string, GroceryItem[]> = {};

    items.forEach((item) => {
      const category = item.Category || "General";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    // Sort items within each category alphabetically
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => {
        const nameA = a.Name.toLowerCase().trim();
        const nameB = b.Name.toLowerCase().trim();
        return nameA.localeCompare(nameB);
      });
    });

    return grouped;
  };

  // Fetch pantry items when component mounts
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const pantryItems = await getPantryItems();
        setAllPantryItems(pantryItems); // Store all items for reference
        const combinedItems = combineItems(pantryItems);
        setItems(combinedItems);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Error fetching pantry items";
        showMessage(errorMessage, "error");
      }
    };

    fetchItems();
  }, [showMessage]);

  const updateQuantity = async (item: GroceryItem, newQuantity: number): Promise<void> => {
    if (newQuantity < 0) {
      return; // Don't allow negative quantities
    }

    const itemKey = `${item.Name}-${item.Category}`;
    setUpdatingQuantities((prev) => new Set(prev).add(itemKey));

    try {
      // Call addItem endpoint to update the item with new quantity
      await apiAddItem(item.Name, item.Category || "General", newQuantity);

      // Refresh the pantry items list after updating quantity
      const updatedItems = await getPantryItems();
      setAllPantryItems(updatedItems);
      const combinedItems = combineItems(updatedItems);
      setItems(combinedItems);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error updating quantity";
      showMessage(errorMessage, "error");
    } finally {
      setUpdatingQuantities((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleQuantityChange = async (item: GroceryItem, delta: number): Promise<void> => {
    const newQuantity = Math.max(0, (item.Quantity || 0) + delta);
    if (newQuantity !== item.Quantity) {
      await updateQuantity(item, newQuantity);
    }
  };

  const handleQuantityInputChange = async (item: GroceryItem, value: string): Promise<void> => {
    const newQuantity = Math.max(0, parseInt(value) || 0);
    if (newQuantity !== item.Quantity) {
      await updateQuantity(item, newQuantity);
    }
  };

  const markAsFinished = async (item: GroceryItem): Promise<void> => {
    console.log("markAsFinished called for item:", item);
    const itemKey = `${item.Name}-${item.Category}`;
    setMarkingItems((prev) => new Set(prev).add(itemKey));

    try {
      console.log("Looking for actual item. allPantryItems count:", allPantryItems.length);
      // Find an actual item with this name that has quantity > 0
      const actualItem = allPantryItems.find(
        (pantryItem) =>
          pantryItem.Name.toLowerCase().trim() === item.Name.toLowerCase().trim() &&
          pantryItem.Quantity > 0
      );

      console.log("Found actualItem:", actualItem);

      if (!actualItem) {
        console.warn(`No items available to mark as finished for "${item.Name}"`);
        showMessage(`No items available to mark as finished for "${item.Name}"`, "error");
        setMarkingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
        return;
      }

      console.log("Calling apiConsumeItem with:", { id: actualItem.Id, name: actualItem.Name });
      // Call consume-item endpoint to mark as finished and add to grocery list
      const result = await apiConsumeItem(actualItem.Id, actualItem.Name);
      console.log("apiConsumeItem result:", result);

      showMessage(`"${item.Name}" marked as finished!`, "success");

      // Refresh the pantry items list after marking as finished
      console.log("Refreshing pantry items...");
      const updatedItems = await getPantryItems();
      setAllPantryItems(updatedItems);
      const combinedItems = combineItems(updatedItems);
      setItems(combinedItems);
      console.log("Pantry items refreshed");
    } catch (err) {
      console.error("Error in markAsFinished:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error marking item as finished";
      showMessage(errorMessage, "error");
    } finally {
      setMarkingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  if (items.length === 0 && !loading) {
    return (
      <div className="empty-state">
        <p>📦 No items in pantry yet.</p>
        <p>Add items to your pantry to get started!</p>
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="loading">Loading...</div>;
  }


  // Group items by category
  const itemsByCategory = groupItemsByCategory(items);
  const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
    // Sort categories alphabetically, but put "General" at the end
    if (a === "General") return 1;
    if (b === "General") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="grocery-suggestions">
      {sortedCategories.map((category) => (
        <div key={category} className="category-section mb-4">
          <h3 className="category-title">
            {getCategoryIcon(category)} {category}
          </h3>
          <div className="items-grid">
            {itemsByCategory[category].map((item, index) => {
              const itemKey = `${item.Name}-${item.Category}`;
              const isUpdating = updatingQuantities.has(itemKey);
              const isMarking = markingItems.has(itemKey);
              const currentQuantity = item.Quantity || 0;

              return (
                <div key={`${item.Name}-${index}`} className="suggestion-item-vertical">
                  <div className="item-name-line">
                    <span className="item-name-small">{item.Name}</span>
                  </div>
                  <div className="item-actions-line">
                    <div className="quantity-controls">
                      <button
                        className="quantity-btn quantity-decrement"
                        onClick={() => handleQuantityChange(item, -1)}
                        disabled={isUpdating || currentQuantity <= 0 || isMarking}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        className="quantity-input-small"
                        value={currentQuantity}
                        min="0"
                        onChange={(e) => handleQuantityInputChange(item, e.target.value)}
                        disabled={isUpdating || isMarking}
                      />
                      <button
                        className="quantity-btn quantity-increment"
                        onClick={() => handleQuantityChange(item, 1)}
                        disabled={isUpdating || isMarking}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    {currentQuantity > 0 && (
                      <button
                        className="btn btn-sm btn-primary add-item-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("Finished button clicked for:", item);
                          markAsFinished(item).catch((err) => {
                            console.error("Unhandled error in markAsFinished:", err);
                          });
                        }}
                        disabled={isMarking}
                        type="button"
                      >
                        {isMarking ? "Marking..." : "Finished"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MarkAsFinished;

