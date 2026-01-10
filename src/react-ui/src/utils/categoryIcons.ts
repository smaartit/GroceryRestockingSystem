// Category to icon mapping
export const getCategoryIcon = (category: string): string => {
  const categoryLower = category.toLowerCase().trim();
  
  const iconMap: Record<string, string> = {
    // Baking Supplies
    "baking supplies": "🥖",
    // Canned, Jarred, Bottled Goods
    "canned, jarred, bottled goods": "🥫",
    // Herbs & Spices
    "herbs & spices": "🌿",
    "herbs and spices": "🌿",
    // Beverages
    "beverages": "🥤",
    // Cooking & Marinating Liquids
    "cooking & marinating liquids": "🫒",
    "cooking and marinating liquids": "🫒",
    // Dry Goods
    "dry goods": "🌾",
    // Snacks
    "snacks": "🍿",
    // Dairy
    "dairy": "🥛",
    // Condiments
    "condiments": "🍯",
    // Produce - Fruits
    "produce - fruits": "🍎",
    "produce - vegetables": "🥬",
    "fruits": "🍎",
    "vegetables": "🥬",
    // Meat
    "meat": "🥩",
    // General/Default
    "general": "📦",
  };

  // Try exact match first
  if (iconMap[categoryLower]) {
    return iconMap[categoryLower];
  }

  // Try partial matches
  if (categoryLower.includes("baking")) return "🥖";
  if (categoryLower.includes("canned") || categoryLower.includes("jarred") || categoryLower.includes("bottled")) return "🥫";
  if (categoryLower.includes("herb") || categoryLower.includes("spice")) return "🌿";
  if (categoryLower.includes("beverage") || categoryLower.includes("drink")) return "🥤";
  if (categoryLower.includes("cooking") || categoryLower.includes("marinating") || categoryLower.includes("oil") || categoryLower.includes("vinegar")) return "🫒";
  if (categoryLower.includes("dry") || categoryLower.includes("grain") || categoryLower.includes("rice") || categoryLower.includes("pasta")) return "🌾";
  if (categoryLower.includes("snack") || categoryLower.includes("chip") || categoryLower.includes("cookie")) return "🍿";
  if (categoryLower.includes("dairy") || categoryLower.includes("milk") || categoryLower.includes("cheese") || categoryLower.includes("yogurt")) return "🥛";
  if (categoryLower.includes("condiment") || categoryLower.includes("sauce") || categoryLower.includes("ketchup") || categoryLower.includes("mustard")) return "🍯";
  if (categoryLower.includes("fruit") || categoryLower.includes("apple") || categoryLower.includes("banana")) return "🍎";
  if (categoryLower.includes("vegetable") || categoryLower.includes("produce") || categoryLower.includes("lettuce") || categoryLower.includes("carrot")) return "🥬";
  if (categoryLower.includes("meat") || categoryLower.includes("chicken") || categoryLower.includes("beef") || categoryLower.includes("pork") || categoryLower.includes("fish")) return "🥩";

  // Default icon
  return "📦";
};

