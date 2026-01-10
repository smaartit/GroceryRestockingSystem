import React, { useEffect, useState } from "react";
import { GroceryItem, MessageType } from "../types";
import { consumeItem as apiConsumeItem, getPantryItems } from "../api";
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
      setLoading(true);
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
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [setLoading, showMessage]);

  const markAsFinished = async (item: GroceryItem): Promise<void> => {
    setLoading(true);

    try {
      // Find an actual item with this name that has quantity > 0
      const actualItem = allPantryItems.find(
        (pantryItem) =>
          pantryItem.Name.toLowerCase().trim() === item.Name.toLowerCase().trim() &&
          pantryItem.Quantity > 0
      );

      if (!actualItem) {
        showMessage(`No items available to mark as finished for "${item.Name}"`, "error");
        setLoading(false);
        return;
      }

      await apiConsumeItem(actualItem.Id, actualItem.Name);

      showMessage(`"${item.Name}" marked as finished!`, "success");

      // Refresh the pantry items list after marking as finished
      const updatedItems = await getPantryItems();
      setAllPantryItems(updatedItems);
      const combinedItems = combineItems(updatedItems);
      setItems(combinedItems);
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
            {itemsByCategory[category].map((item, index) => (
              <div key={`${item.Name}-${index}`} className="suggestion-item">
                <span className="item-name-small">
                  {item.Name}
                  {item.Quantity > 0 && (
                    <span className="pantry-quantity-badge">{item.Quantity}</span>
                  )}
                </span>
                {item.Quantity > 0 && (
                  <button
                    className="btn btn-sm btn-primary add-item-btn"
                    onClick={() => markAsFinished(item)}
                    disabled={loading}
                  >
                    Mark as Finished
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MarkAsFinished;

