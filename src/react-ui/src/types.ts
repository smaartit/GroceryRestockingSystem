// Type definitions for the Grocery Restocking System

export interface GroceryItem {
  Id: string;
  Name: string;
  Category: string;
  Quantity: number;
  finished: boolean;
  Price?: number;
}

export interface NewItemForm {
  name: string;
  category: string;
  quantity: number | string;
}

export type TabType = "add" | "finish" | "shopping";

export type MessageType = "error" | "success";

// Type for grocery item suggestions structure (simplified to one level)
export type GroceryItemSuggestions = Record<string, string[]>;

