// Shared vocabulary for tagging clothing. Kept in one place so the catalog
// filters, the edit form, and (later) the outfit engine and chat tools all
// speak the same language.

export const CATEGORIES = [
  { id: "top", label: "Tops", layer: "base" },
  { id: "bottom", label: "Bottoms", layer: "base" },
  { id: "dress", label: "Dresses & jumpsuits", layer: "base" },
  { id: "outerwear", label: "Outerwear", layer: "outer" },
  { id: "knitwear", label: "Knitwear & layers", layer: "mid" },
  { id: "shoes", label: "Shoes", layer: "feet" },
  { id: "bag", label: "Bags", layer: "accessory" },
  { id: "accessory", label: "Accessories", layer: "accessory" },
  { id: "activewear", label: "Activewear", layer: "base" },
  { id: "uncategorized", label: "Needs tagging", layer: "none" },
] as const;
export type Category = (typeof CATEGORIES)[number]["id"];

export const SUBCATEGORIES: Partial<Record<Category, string[]>> = {
  top: ["T-shirt", "Tank", "Shirt", "Blouse", "Polo", "Henley", "Long sleeve", "Crop top", "Bodysuit"],
  bottom: ["Jeans", "Trousers", "Shorts", "Skirt", "Joggers", "Leggings"],
  dress: ["Mini dress", "Midi dress", "Maxi dress", "Jumpsuit", "Romper"],
  outerwear: ["Jacket", "Coat", "Blazer", "Raincoat", "Puffer", "Vest"],
  knitwear: ["Sweater", "Cardigan", "Hoodie", "Sweatshirt", "Fleece"],
  shoes: ["Sneakers", "Boots", "Sandals", "Loafers", "Heels", "Flats"],
  bag: ["Tote", "Crossbody", "Backpack", "Clutch"],
  accessory: ["Hat", "Scarf", "Belt", "Jewelry", "Sunglasses", "Watch"],
  activewear: ["Sports top", "Sports bottom", "Swim"],
};

// Named colour palette. Auto-detection snaps photo colours to these, and the
// filter swatches use the same hex values.
export const COLORS = [
  { id: "black", label: "Black", hex: "#1c1c1c" },
  { id: "white", label: "White", hex: "#f7f7f5" },
  { id: "cream", label: "Cream", hex: "#efe6d2" },
  { id: "grey", label: "Grey", hex: "#8e8e8e" },
  { id: "beige", label: "Beige", hex: "#cdb79a" },
  { id: "brown", label: "Brown", hex: "#6f4a2f" },
  { id: "navy", label: "Navy", hex: "#1f2d4f" },
  { id: "blue", label: "Blue", hex: "#2f5fb3" },
  { id: "lightblue", label: "Light blue", hex: "#9cc3e6" },
  { id: "green", label: "Green", hex: "#3c8a4f" },
  { id: "olive", label: "Olive", hex: "#6b6b34" },
  { id: "yellow", label: "Yellow", hex: "#e8c840" },
  { id: "orange", label: "Orange", hex: "#e07b2e" },
  { id: "red", label: "Red", hex: "#c0312b" },
  { id: "burgundy", label: "Burgundy", hex: "#6d1f2b" },
  { id: "pink", label: "Pink", hex: "#e9a0b4" },
  { id: "purple", label: "Purple", hex: "#7a4fa0" },
] as const;
export type ColorId = (typeof COLORS)[number]["id"];

export const PATTERNS = ["Solid", "Striped", "Plaid", "Floral", "Graphic", "Polka dot", "Animal", "Denim wash", "Other"] as const;

// Which weather an item is comfortable in. Maps onto temperature bands the
// weather feature will use (see WARMTH_BANDS).
export const WARMTH = [
  { id: "hot", label: "Hot", hint: "25°C+ / 77°F+" },
  { id: "warm", label: "Warm", hint: "18–25°C / 64–77°F" },
  { id: "mild", label: "Mild", hint: "10–18°C / 50–64°F" },
  { id: "cold", label: "Cold", hint: "under 10°C / 50°F" },
] as const;
export type Warmth = (typeof WARMTH)[number]["id"];
export const WARMTH_BANDS: Record<Warmth, [number, number]> = {
  hot: [25, 99],
  warm: [18, 25],
  mild: [10, 18],
  cold: [-99, 10],
};

export const FORMALITY = [
  { id: "lounge", label: "Lounge" },
  { id: "casual", label: "Casual" },
  { id: "smart", label: "Smart casual" },
  { id: "business", label: "Business" },
  { id: "formal", label: "Formal" },
] as const;
export type Formality = (typeof FORMALITY)[number]["id"];

export const STYLES = [
  "Minimal", "Streetwear", "Classic", "Preppy", "Sporty", "Boho",
  "Edgy", "Romantic", "Vintage", "Workwear", "Going out",
] as const;

export const LAUNDRY = [
  { id: "clean", label: "Clean" },
  { id: "worn", label: "Worn, still OK" },
  { id: "laundry", label: "In the laundry" },
] as const;
export type Laundry = (typeof LAUNDRY)[number]["id"];

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
export function colorHex(id: string) {
  return COLORS.find((c) => c.id === id)?.hex ?? "#ccc";
}
export function colorLabel(id: string) {
  return COLORS.find((c) => c.id === id)?.label ?? id;
}
