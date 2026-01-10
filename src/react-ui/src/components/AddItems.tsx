import React, { useState } from "react";
import { NewItemForm, MessageType } from "../types";
import { addItem as apiAddItem } from "../api";
import { groceryItemSuggestions } from "../data/grocerySuggestions";

interface AddItemsProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showMessage: (message: string, type: MessageType) => void;
}

const AddItems: React.FC<AddItemsProps> = ({
  loading,
  setLoading,
  showMessage,
}) => {
  const [newItem, setNewItem] = useState<NewItemForm>({
    name: "",
    category: "",
    quantity: 1,
  });

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

    setLoading(true);

    try {
      await apiAddItem(
        nameToAdd,
        category || newItem.category || "General",
        quantity || parseInt(String(newItem.quantity)) || 1
      );

      showMessage(`"${nameToAdd}" added successfully!`, "success");

      // Reset form only if called from manual input
      if (!itemName) {
        setNewItem({
          name: "",
          category: "",
          quantity: 1,
        });
      }
    } catch (err) {
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
        <input
          type="text"
          placeholder="Category (optional)"
          value={newItem.category}
          onChange={(e) =>
            setNewItem({ ...newItem, category: e.target.value })
          }
        />
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
                {items.map((itemName: string) => (
                  <div key={itemName} className="suggestion-item">
                    <span className="item-name-small">{itemName}</span>
                    <button
                      className="btn btn-sm btn-primary add-item-btn"
                      onClick={() => handleAddItem(itemName, category, 1)}
                      disabled={loading}
                    >
                      Add Item
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AddItems;

