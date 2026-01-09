import React, { useState } from "react";
import "./App.css";
import {
  GroceryItem,
  NewItemForm,
  TabType,
  MessageType,
  GroceryItemSuggestions,
} from "./types";

const DEFAULT_API_BASE_URL =
  "https://g9orskr1ab.execute-api.us-east-1.amazonaws.com/prod";

// Mock data for demonstration - in production, you'd fetch from an API
const mockItems: GroceryItem[] = [
  {
    Id: "1",
    Name: "Milk",
    Category: "Dairy",
    Quantity: 2,
    finished: false,
  },
  {
    Id: "2",
    Name: "Bread",
    Category: "Bakery",
    Quantity: 1,
    finished: false,
  },
  {
    Id: "3",
    Name: "Eggs",
    Category: "Dairy",
    Quantity: 0,
    finished: true,
  },
];

// Comprehensive grocery items list organized by category
const groceryItemSuggestions: GroceryItemSuggestions = {
  "Pantry Essentials": {
    "Baking Supplies": [
      "Active dry yeast",
      "All Purpose Flour",
      "Almond extract",
      "Almond flour",
      "Baking soda",
      "Baking powder",
      "Biscuit mix",
      "Brown sugar",
      "Cocoa powder",
      "Cornstarch",
      "Chocolate chips",
      "Evaporated milk",
      "Food coloring",
      "Powdered Sugar",
      "Sugar (granulated)",
      "Sweetened condensed milk",
      "Vanilla extract",
      "Vegetable shortening",
    ],
    "Canned, Jarred, Bottled Goods": [
      "Beef broth",
      "Black beans",
      "Canned fruit",
      "Canned meats (tuna, salmon, chicken)",
      "Canned tomatoes (diced, stewed, roasted)",
      "Canned vegetables (corn, green beans)",
      "Chicken Broth",
      "Coconut milk",
      "Cream of chicken soup",
      "Cream of mushroom soup",
      "Garbanzo beans",
      "Honey",
      "Maple syrup",
      "Marinara sauce",
      "Salsa",
      "Tomato paste",
      "Tomato sauce",
      "Vegetable stock",
      "White beans (navy, cannellini, Great Northern)",
    ],
    "Herbs & Spices": {
      "Dried Herbs": [
        "Basil",
        "Bay leaves",
        "Black pepper",
        "Fennel or dill seed",
        "Italian seasoning",
        "Oregano",
        "Red pepper flakes",
        "Rosemary",
        "Sea salt",
        "Sesame seeds",
        "Thyme",
      ],
      Spices: [
        "Adobo",
        "Allspice",
        "Cajun seasoning",
        "Cayenne pepper",
        "Chili powder",
        "Cinnamon (ground & sticks)",
        "Cloves (ground & whole)",
        "Cumin",
        "Curry powder",
        "Garlic powder",
        "Ground ginger",
        "Montreal Steak Seasoning",
        "Nutmeg",
        "Onion powder",
        "Paprika",
        "Peppercorns",
        "Turmeric",
      ],
    },
    Beverages: ["Coffee", "Tea", "Wine (red and white)"],
    "Cooking & Marinating Liquids": [
      "Apple cider vinegar",
      "Balsamic vinegar",
      "Extra virgin olive oil",
      "Red wine vinegar",
      "Rice vinegar",
      "Sesame oil",
      "Vegetable oil",
      "White wine vinegar",
      "White vinegar",
    ],
    "Dry Goods": [
      "Beans (lentils, kidney, black)",
      "Bouillon (cubes or powder, chicken and beef)",
      "Bread crumbs or Panko",
      "Brown rice",
      "Cereal",
      "Dried onion soup mix",
      "Old-fashioned oats",
      "Pasta (spaghetti, lasagna, egg noodles, penne)",
      "Taco seasoning packets",
      "White rice",
    ],
    Snacks: [
      "Applesauce",
      "Marshmallows",
      "Chips",
      "Cookies",
      "Crackers",
      "Dried fruit",
      "Peanut butter",
      "Popcorn",
      "Pretzels",
      "Tortillas",
    ],
  },
  Refrigerator: {
    Dairy: [
      "Butter",
      "Cheese (sliced, shredded, block, cheddar, mozzarella)",
      "Cream cheese",
      "Eggs",
      "Milk",
      "Plain yogurt",
      "Sour cream",
    ],
    Condiments: [
      "Barbecue sauce",
      "Hot sauce",
      "Jelly or jam",
      "Ketchup",
      "Mayonnaise",
      "Mustard (Dijon, brown, yellow)",
      "Pickles",
      "Salad dressings (Italian, ranch)",
      "Soy sauce",
      "Worcestershire sauce",
    ],
  },
  Produce: {
    "Not Refrigerated": ["Apples", "Bananas", "Garlic", "Onions", "Potatoes"],
    Refrigerated: [
      "Bell peppers",
      "Carrots",
      "Cilantro",
      "Leafy greens (spinach, kale)",
      "Lemons",
      "Lettuce",
      "Limes",
      "Parsley",
    ],
  },
  Freezer: [
    "Bacon",
    "Bread",
    "Chicken (boneless, skinless breasts, wings, legs, thighs, whole)",
    "Fruit (mango, strawberries, raspberries)",
    "Ground beef",
    "Nuts (almonds, pecans, walnuts)",
    "Sausage",
    "Shrimp",
    "Vanilla ice cream",
    "Vegetables (peas, corn, broccoli, mixed)",
  ],
};

const App: React.FC = () => {
  const [items, setItems] = useState<GroceryItem[]>(mockItems);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<NewItemForm>({
    name: "",
    category: "",
    quantity: 1,
  });
  const [activeTab, setActiveTab] = useState<TabType>("add");

  const apiBaseUrl = DEFAULT_API_BASE_URL;

  const showMessage = (message: string, type: MessageType): void => {
    if (type === "error") {
      setError(message);
      setSuccess(null);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccess(message);
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const addItem = async (
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
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Name: nameToAdd,
          Category: category || newItem.category || "General",
          Quantity: quantity || parseInt(String(newItem.quantity)) || 1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to add item");
      }

      const result = await response.text();
      showMessage(`"${nameToAdd}" added successfully!`, "success");

      // Reset form only if called from manual input
      if (!itemName) {
        setNewItem({
          name: "",
          category: "",
          quantity: 1,
        });
      }

      // Note: In a real app, you'd fetch the updated list here
      // For now, we'll just show the success message
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error adding item";
      showMessage(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const markAsFinished = async (item: GroceryItem): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/consume-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: item.Id,
          itemName: item.Name,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to mark item as finished");
      }

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

  const buyAgain = async (item: GroceryItem): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const newQuantity = (item.Quantity || 0) + 1;

      const response = await fetch(`${apiBaseUrl}/items/${item.Id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Quantity: newQuantity,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update item");
      }

      showMessage(`"${item.Name}" quantity updated!`, "success");

      // Update local state
      setItems(
        items.map((i) =>
          i.Id === item.Id
            ? { ...i, Quantity: newQuantity, finished: false }
            : i
        )
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error updating item";
      showMessage(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const finishedItems = items.filter((i) => i.finished);
  const unfinishedItems = items.filter((i) => !i.finished);

  return (
    <div className="app">
      <div className="app-header">
        <h1>🛒 Grocery Restocking</h1>
        <p>Track your groceries and never run out!</p>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={"nav-link" + (activeTab === "add" ? " active" : "")}
            onClick={() => setActiveTab("add")}
          >
            Add Items
          </button>
        </li>
        <li className="nav-item">
          <button
            className={"nav-link" + (activeTab === "finish" ? " active" : "")}
            onClick={() => setActiveTab("finish")}
          >
            Mark as Finished
          </button>
        </li>
        <li className="nav-item">
          <button
            className={"nav-link" + (activeTab === "shopping" ? " active" : "")}
            onClick={() => setActiveTab("shopping")}
          >
            Shopping List
          </button>
        </li>
      </ul>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {activeTab === "add" && (
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
            <button onClick={() => addItem()} disabled={loading}>
              {loading ? "Adding..." : "Add Custom Item"}
            </button>
          </div>

          <div className="grocery-suggestions">
            {Object.entries(groceryItemSuggestions).map(
              ([mainCategory, subCategories]) => (
                <div key={mainCategory} className="category-section mb-4">
                  <h3 className="category-title">{mainCategory}</h3>
                  {Array.isArray(subCategories) ? (
                    <div className="items-grid">
                      {subCategories.map((itemName: string) => (
                        <div key={itemName} className="suggestion-item">
                          <span className="item-name-small">{itemName}</span>
                          <button
                            className="btn btn-sm btn-primary add-item-btn"
                            onClick={() => addItem(itemName, mainCategory, 1)}
                            disabled={loading}
                          >
                            Add Item
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    Object.entries(subCategories).map(
                      ([subCategory, items]) => {
                        // Check if items is an array (direct items) or an object (nested subcategories)
                        if (Array.isArray(items)) {
                          return (
                            <div
                              key={subCategory}
                              className="subcategory-section"
                            >
                              <h4 className="subcategory-title">
                                {subCategory}
                              </h4>
                              <div className="items-grid">
                                {items.map((itemName: string) => (
                                  <div key={itemName} className="suggestion-item">
                                    <span className="item-name-small">
                                      {itemName}
                                    </span>
                                    <button
                                      className="btn btn-sm btn-primary add-item-btn"
                                      onClick={() =>
                                        addItem(itemName, subCategory, 1)
                                      }
                                      disabled={loading}
                                    >
                                      Add Item
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } else {
                          // Handle nested structure (e.g., "Herbs & Spices" -> "Dried Herbs" and "Spices")
                          return (
                            <div
                              key={subCategory}
                              className="subcategory-section"
                            >
                              <h4 className="subcategory-title">
                                {subCategory}
                              </h4>
                              {Object.entries(items).map(
                                ([nestedSubCategory, nestedItems]) => (
                                  <div
                                    key={nestedSubCategory}
                                    className="subcategory-section"
                                  >
                                    <h5
                                      className="subcategory-title"
                                      style={{
                                        fontSize: "0.95rem",
                                        marginLeft: "10px",
                                      }}
                                    >
                                      {nestedSubCategory}
                                    </h5>
                                    <div className="items-grid">
                                      {Array.isArray(nestedItems) &&
                                        nestedItems.map((itemName: string) => (
                                          <div
                                            key={itemName}
                                            className="suggestion-item"
                                          >
                                            <span className="item-name-small">
                                              {itemName}
                                            </span>
                                            <button
                                              className="btn btn-sm btn-primary add-item-btn"
                                              onClick={() =>
                                                addItem(
                                                  itemName,
                                                  nestedSubCategory,
                                                  1
                                                )
                                              }
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
                          );
                        }
                      }
                    )
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {activeTab === "finish" && (
        <>
          {loading && unfinishedItems.length === 0 ? (
            <div className="loading">Loading...</div>
          ) : unfinishedItems.length === 0 ? (
            <div className="empty-state">
              <p>✅ All items are finished!</p>
            </div>
          ) : (
            <ul className="grocery-list">
              {unfinishedItems.map((item) => (
                <li key={item.Id} className="grocery-item">
                  <div className="item-info">
                    <span className="item-name">{item.Name}</span>
                    <div className="item-details">
                      {item.Category && (
                        <span className="item-category">
                          📁 {item.Category}
                        </span>
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
          )}
        </>
      )}

      {activeTab === "shopping" && (
        <>
          {loading && finishedItems.length === 0 ? (
            <div className="loading">Loading...</div>
          ) : finishedItems.length === 0 ? (
            <div className="empty-state">
              <p>No finished items yet.</p>
              <p>Mark items as finished to build your shopping list.</p>
            </div>
          ) : (
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
                        <span className="item-category">
                          📁 {item.Category}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default App;

