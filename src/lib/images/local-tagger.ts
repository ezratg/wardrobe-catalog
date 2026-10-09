import path from "node:path";
import sharp from "sharp";
import { DATA_DIR } from "@/db";
import { colorLabel } from "@/lib/taxonomy";
import type { Tags } from "./tagger";

/**
 * Free, on-device auto-tagging with CLIP, an open-source image model that
 * scores a photo against text descriptions. No account or API key needed; the
 * model (about 150 MB) is downloaded once on first use and cached in
 * data/models. It picks the garment type; dress code and weather come from a
 * per-type table; the name combines the detected colour and the type.
 */
const MODEL_ID = "Xenova/clip-vit-base-patch32";

type Garment = { category: string; subcategory: string; prompt: string; formality: string; warmth: string[] };

// One row per thing CLIP is asked to recognise. Prompts are phrased the way
// product photos are usually captioned, which CLIP matches best.
export const GARMENTS: Garment[] = [
  { category: "top", subcategory: "T-shirt", prompt: "a t-shirt", formality: "casual", warmth: ["hot", "warm"] },
  { category: "top", subcategory: "Tank", prompt: "a tank top", formality: "casual", warmth: ["hot"] },
  { category: "top", subcategory: "Shirt", prompt: "a button-up shirt", formality: "smart", warmth: ["warm", "mild"] },
  { category: "top", subcategory: "Blouse", prompt: "a blouse", formality: "smart", warmth: ["warm", "mild"] },
  { category: "top", subcategory: "Polo", prompt: "a polo shirt", formality: "casual", warmth: ["hot", "warm"] },
  { category: "top", subcategory: "Long sleeve", prompt: "a long sleeve top", formality: "casual", warmth: ["mild"] },
  { category: "top", subcategory: "Crop top", prompt: "a crop top", formality: "casual", warmth: ["hot", "warm"] },
  { category: "bottom", subcategory: "Jeans", prompt: "a pair of jeans", formality: "casual", warmth: ["warm", "mild", "cold"] },
  { category: "bottom", subcategory: "Trousers", prompt: "a pair of trousers", formality: "smart", warmth: ["warm", "mild", "cold"] },
  { category: "bottom", subcategory: "Shorts", prompt: "a pair of shorts", formality: "casual", warmth: ["hot", "warm"] },
  { category: "bottom", subcategory: "Skirt", prompt: "a skirt", formality: "smart", warmth: ["hot", "warm", "mild"] },
  { category: "bottom", subcategory: "Joggers", prompt: "a pair of sweatpants", formality: "lounge", warmth: ["mild", "cold"] },
  { category: "bottom", subcategory: "Leggings", prompt: "a pair of leggings", formality: "casual", warmth: ["mild", "cold"] },
  { category: "dress", subcategory: "Dress", prompt: "a dress", formality: "smart", warmth: ["hot", "warm"] },
  { category: "dress", subcategory: "Jumpsuit", prompt: "a jumpsuit", formality: "casual", warmth: ["warm", "mild"] },
  { category: "outerwear", subcategory: "Jacket", prompt: "a jacket", formality: "casual", warmth: ["mild", "cold"] },
  { category: "outerwear", subcategory: "Coat", prompt: "a long coat", formality: "smart", warmth: ["cold"] },
  { category: "outerwear", subcategory: "Blazer", prompt: "a blazer", formality: "business", warmth: ["mild"] },
  { category: "outerwear", subcategory: "Puffer", prompt: "a puffer jacket", formality: "casual", warmth: ["cold"] },
  { category: "outerwear", subcategory: "Raincoat", prompt: "a raincoat", formality: "casual", warmth: ["mild", "cold"] },
  { category: "outerwear", subcategory: "Vest", prompt: "a vest", formality: "casual", warmth: ["mild"] },
  { category: "knitwear", subcategory: "Sweater", prompt: "a knit sweater", formality: "casual", warmth: ["mild", "cold"] },
  { category: "knitwear", subcategory: "Cardigan", prompt: "a cardigan", formality: "casual", warmth: ["mild"] },
  { category: "knitwear", subcategory: "Hoodie", prompt: "a hoodie", formality: "lounge", warmth: ["mild", "cold"] },
  { category: "knitwear", subcategory: "Sweatshirt", prompt: "a sweatshirt", formality: "casual", warmth: ["mild", "cold"] },
  { category: "shoes", subcategory: "Sneakers", prompt: "a pair of sneakers", formality: "casual", warmth: ["hot", "warm", "mild", "cold"] },
  { category: "shoes", subcategory: "Boots", prompt: "a pair of boots", formality: "casual", warmth: ["mild", "cold"] },
  { category: "shoes", subcategory: "Sandals", prompt: "a pair of sandals", formality: "casual", warmth: ["hot", "warm"] },
  { category: "shoes", subcategory: "Loafers", prompt: "a pair of loafers", formality: "smart", warmth: ["warm", "mild"] },
  { category: "shoes", subcategory: "Heels", prompt: "a pair of high heels", formality: "formal", warmth: ["hot", "warm", "mild"] },
  { category: "shoes", subcategory: "Flats", prompt: "a pair of ballet flats", formality: "smart", warmth: ["hot", "warm", "mild"] },
  { category: "bag", subcategory: "Tote", prompt: "a tote bag", formality: "casual", warmth: [] },
  { category: "bag", subcategory: "Crossbody", prompt: "a crossbody handbag", formality: "smart", warmth: [] },
  { category: "bag", subcategory: "Backpack", prompt: "a backpack", formality: "casual", warmth: [] },
  { category: "accessory", subcategory: "Hat", prompt: "a hat", formality: "casual", warmth: [] },
  { category: "accessory", subcategory: "Scarf", prompt: "a scarf", formality: "casual", warmth: ["cold"] },
  { category: "accessory", subcategory: "Belt", prompt: "a belt", formality: "smart", warmth: [] },
  { category: "accessory", subcategory: "Jewelry", prompt: "a piece of jewelry", formality: "smart", warmth: [] },
  { category: "accessory", subcategory: "Sunglasses", prompt: "a pair of sunglasses", formality: "casual", warmth: ["hot", "warm"] },
];

const PATTERNS: { pattern: string; prompt: string }[] = [
  { pattern: "Solid", prompt: "plain solid-colored fabric" },
  { pattern: "Striped", prompt: "striped fabric" },
  { pattern: "Plaid", prompt: "plaid fabric" },
  { pattern: "Floral", prompt: "floral print fabric" },
  { pattern: "Graphic", prompt: "fabric with a printed graphic or logo" },
  { pattern: "Polka dot", prompt: "polka dot fabric" },
  { pattern: "Animal", prompt: "leopard animal print fabric" },
];

type Scored = { label: string; score: number }[];
export type Pixels = { data: Buffer; width: number; height: number };
type Classifier = (image: Pixels, labels: string[], opts?: { hypothesis_template?: string }) => Promise<Scored>;

let classifier: Promise<Classifier> | undefined;

async function loadClassifier(): Promise<Classifier> {
  const { pipeline, env, RawImage } = await import("@huggingface/transformers");
  env.cacheDir = path.join(DATA_DIR, "models");
  const pipe = await pipeline("zero-shot-image-classification", MODEL_ID, { dtype: "q8" });
  return (img, labels, opts) =>
    pipe(new RawImage(new Uint8ClampedArray(img.data), img.width, img.height, 3), labels, opts) as Promise<Scored>;
}

/** Below this, the model is guessing; leave the item for the owner to tag. */
const MIN_CONFIDENCE = 0.15;

export async function tagPhotoLocally(image: Buffer, colors: string[], classify?: Classifier): Promise<Tags> {
  if (!classify) {
    classifier ??= loadClassifier().catch((err) => {
      classifier = undefined; // allow a retry later, e.g. after going back online
      throw new Error(`Couldn't load the free tagging model (${err instanceof Error ? err.message : err})`);
    });
    classify = await classifier;
  }

  // Show CLIP the garment on white, as in product shots.
  const { data, info } = await sharp(image)
    .resize(448, 448, { fit: "inside" })
    .flatten({ background: "#ffffff" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels: Pixels = { data, width: info.width, height: info.height };
  const kinds = await classify(pixels, GARMENTS.map((g) => g.prompt), { hypothesis_template: "a product photo of {}" });
  const top = [...kinds].sort((a, b) => b.score - a.score)[0];
  const garment = GARMENTS.find((g) => g.prompt === top?.label);
  if (!garment || top.score < MIN_CONFIDENCE) {
    return { name: "", category: "uncategorized", subcategory: "", colors, pattern: "", formality: "", warmth: [], styles: [] };
  }

  let pattern = garment.subcategory === "Jeans" ? "Denim wash" : "Solid";
  if (pattern === "Solid") {
    const scored = await classify(pixels, PATTERNS.map((x) => x.prompt), { hypothesis_template: "a close-up of {}" });
    const p = [...scored].sort((a, b) => b.score - a.score)[0];
    // Patterns are easy to over-call; only accept a confident one.
    if (p && p.score >= 0.5) pattern = PATTERNS.find((x) => x.prompt === p.label)?.pattern ?? "Solid";
  }

  return {
    name: nameFor(garment.subcategory, colors[0]),
    category: garment.category,
    subcategory: garment.subcategory,
    colors,
    pattern,
    formality: garment.formality,
    warmth: garment.warmth,
    styles: [],
  };
}

export function nameFor(subcategory: string, color?: string) {
  const type = subcategory === "T-shirt" ? subcategory : subcategory.toLowerCase();
  if (!color) return subcategory;
  const c = colorLabel(color);
  return `${c[0].toUpperCase()}${c.slice(1).toLowerCase()} ${type}`;
}
