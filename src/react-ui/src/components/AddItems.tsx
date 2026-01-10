import React, { useState, useEffect } from "react";
import { NewItemForm, MessageType, GroceryItem } from "../types";
import { addItem as apiAddItem, getPantryItems } from "../api";
import { groceryItemSuggestions } from "../data/grocerySuggestions";

interface AddItemsProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showMessage: (message: string, type: MessageType) => void;
  showProcessingMessage?: (message: string) => void;
  clearProcessingMessage?: () => void;
}

const AddItems: React.FC<AddItemsProps> = ({
  loading,
  setLoading,
  showMessage,
  showProcessingMessage,
  clearProcessingMessage,
}) => {
  const [newItem, setNewItem] = useState<NewItemForm>({
    name: "",
    category: "",
    quantity: 1,
  });
  const [pantryItems, setPantryItems] = useState<GroceryItem[]>([]);
  const [pantryQuantityMap, setPantryQuantityMap] = useState<Record<string, number>>({});

  // Get all category names for autocomplete
  const categories = Object.keys(groceryItemSuggestions);

  // Helper function to update pantry quantity map
  const updatePantryQuantityMap = (items: GroceryItem[]) => {
    const quantityMap: Record<string, number> = {};
    items.forEach((item) => {
      const itemName = item.Name.toLowerCase().trim();
      quantityMap[itemName] = (quantityMap[itemName] || 0) + item.Quantity;
    });
    setPantryQuantityMap(quantityMap);
  };

  // Fetch pantry items on component mount
  useEffect(() => {
    const fetchPantryItems = async () => {
      try {
        const items = await getPantryItems();
        setPantryItems(items);
        updatePantryQuantityMap(items);
      } catch (err) {
        // Silently fail - pantry items might not be available yet
        console.error("Error fetching pantry items:", err);
      }
    };

    fetchPantryItems();
  }, []); // Only run on mount

  const handleAddItem = async (
    itemName?: string,
    category: string = "General",
    quantity: number = 1
  ): Promise<void> => {
    const nameToAdd = itemName || newItem.name.trim();
    if (!nameToAdd) {
      showMessage("Please enter an item name", "error");
      return;
    }

    const itemQuantity = quantity || parseInt(String(newItem.quantity)) || 1;
    const itemCategory = category || newItem.category || "General";

    setLoading(true);

    try {
      // Optimistically update UI immediately for better UX
      const tempItem: GroceryItem = {
        Id: `temp-${Date.now()}`,
        Name: nameToAdd,
        Category: itemCategory,
        Quantity: itemQuantity,
        finished: false,
      };
      const optimisticItems = [...pantryItems, tempItem];
      setPantryItems(optimisticItems);
      updatePantryQuantityMap(optimisticItems);

      // Reset form early (optimistic update)
      if (!itemName) {
        setNewItem({
          name: "",
          category: "",
          quantity: 1,
        });
      }

      // Make the actual API call
      await apiAddItem(nameToAdd, itemCategory, itemQuantity);

      showMessage(`"${nameToAdd}" added successfully!`, "success");

      // Fetch fresh data in background (non-blocking)
      getPantryItems()
        .then((updatedItems) => {
          setPantryItems(updatedItems);
          updatePantryQuantityMap(updatedItems);
        })
        .catch((err) => {
          console.error("Background refresh failed:", err);
          // Don't show error to user since item was already added
        });
    } catch (err) {
      // Refresh from server on error to ensure consistency
      try {
        const refreshedItems = await getPantryItems();
        setPantryItems(refreshedItems);
        updatePantryQuantityMap(refreshedItems);
      } catch (refreshErr) {
        // If refresh fails, just log it
        console.error("Error refreshing pantry items:", refreshErr);
      }
      
      const errorMessage =
        err instanceof Error ? err.message : "Error adding item";
      showMessage(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="add-item-form mb-4">
        <input
          type="text"
          placeholder="Item name (e.g., Milk)"
          value={newItem.name}
          onChange={(e) =>
            setNewItem({ ...newItem, name: e.target.value })
          }
        />
        <div style={{ position: "relative", flex: 1, minWidth: "150px" }}>
          <input
            type="text"
            placeholder="Category (optional)"
            value={newItem.category}
            onChange={(e) =>
              setNewItem({ ...newItem, category: e.target.value })
            }
            list="category-suggestions"
            autoComplete="off"
          />
          <datalist id="category-suggestions">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>
        <input
          type="number"
          placeholder="Quantity"
          min="1"
          value={newItem.quantity}
          onChange={(e) =>
            setNewItem({ ...newItem, quantity: e.target.value })
          }
        />
        <button onClick={() => handleAddItem()} disabled={loading}>
          {loading ? "Adding..." : "Add Custom Item"}
        </button>
      </div>

      <div className="grocery-suggestions">
        {Object.entries(groceryItemSuggestions).map(
          ([category, items]) => (
            <div key={category} className="category-section mb-4">
              <h3 className="category-title">{category}</h3>
              <div className="items-grid">
                {items.map((itemName: string) => {
                  const itemNameLower = itemName.toLowerCase().trim();
                  const quantity = pantryQuantityMap[itemNameLower] || 0;
                  
                  return (
                    <div key={itemName} className="suggestion-item">
                      <span className="item-name-small">
                        {itemName}
                        {quantity > 0 && (
                          <span className="pantry-quantity-badge">{quantity}</span>
                        )}
                      </span>
                      <button
                        className="btn btn-sm btn-primary add-item-btn"
                        onClick={() => handleAddItem(itemName, category, 1)}
                        disabled={loading}
                      >
                        Add Item
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AddItems;

