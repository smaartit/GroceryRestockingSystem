import { GroceryItem } from "./types";
import { getApiBaseUrl } from "./config";

// API request interface
interface AddItemRequest {
  Name: string;
  Category: string;
  Quantity: number;
}

interface ConsumeItemRequest {
  itemId: string;
  itemName: string;
}

interface UpdateStockRequest {
  Quantity: number;
}

// Generic API call helper
const apiCall = async <T>(
  endpoint: string,
  method: string,
  body?: unknown
): Promise<T> => {
  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Failed to ${method} ${endpoint}`);
  }

  return (await response.text()) as T;
};

// Add a new grocery item
export const addItem = async (
  name: string,
  category: string = "General",
  quantity: number = 1
): Promise<string> => {
  const requestBody: AddItemRequest = {
    Name: name,
    Category: category,
    Quantity: quantity,
  };

  return apiCall<string>("/items", "POST", requestBody);
};

// Mark an item as consumed (finished)
export const consumeItem = async (
  itemId: string,
  itemName: string
): Promise<string> => {
  const requestBody: ConsumeItemRequest = {
    itemId,
    itemName,
  };

  return apiCall<string>("/consume-item", "POST", requestBody);
};

// Update item quantity (buy again)
export const updateItemQuantity = async (
  itemId: string,
  quantity: number
): Promise<string> => {
  const requestBody: UpdateStockRequest = {
    Quantity: quantity,
  };

  return apiCall<string>(`/items/${itemId}`, "PUT", requestBody);
};

// Get all pantry items
export const getPantryItems = async (): Promise<GroceryItem[]> => {
  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}/items`;

  const options: RequestInit = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to get pantry items");
  }

  const items = await response.json();
  return items as GroceryItem[];
};

// Get all grocery list items
export const getGroceryList = async (): Promise<GroceryItem[]> => {
  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}/grocery-list`;

  const options: RequestInit = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to get grocery list items");
  }

  const items = await response.json();
  return items as GroceryItem[];
};

// Delete an item from grocery list
export const deleteGroceryListItem = async (itemId: string): Promise<string> => {
  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}/grocery-list/${itemId}`;

  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to delete grocery list item");
  }

  return await response.text();
};

