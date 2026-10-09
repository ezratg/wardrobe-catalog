import path from "node:path";
import sharp from "sharp";
import { DATA_DIR } from "@/db";
import { colorLabel } from "@/lib/taxonomy";
import type { Tags } from "./tagger";

/**
 * Free, on-device auto-tagging with CLIP, an open-source image model that
 * scores a photo against text descriptions. No account or API key needed; the
 * model (about 150 MB) is downloaded once on first use and cached in
 * data/models. It decides in two steps, first the broad category and then the
 * type within it, so near-identical types only compete with each other. Dress
 * code and weather come from a per-type table; the name combines the detected
 * colour and the type.
 */
const MODEL_ID = "Xenova/clip-vit-base-patch32";

type Garment = { category: string; subcategory: string; prompt: string; formality: string; warmth: string[] };

// Several phrasings per category; their scores are averaged so no single
// word (CLIP is oddly fond of "polo") decides on its own.
export const CATEGORY_PROMPTS: Record<string, string[]> = {
  top: ["a t-shirt", "a shirt", "a top", "a blouse", "a polo shirt", "a tank top"],
  bottom: ["a pair of pants", "a pair of jeans", "a pair of trousers", "a pair of shorts", "a skirt"],
  dress: ["a dress", "a jumpsuit"],
  outerwear: ["a jacket", "a coat", "a blazer"],
  knitwear: ["a sweater", "a hoodie", "a cardigan"],
  shoes: ["a pair of shoes", "a pair of sneakers", "a pair of boots"],
  bag: ["a bag", "a handbag", "a backpack"],
  accessory: ["a hat", "a scarf", "a belt", "sunglasses"],
};

// Types within each category. Prompts describe what tells look-alikes apart
// (a polo's collar and buttons); bare "a polo shirt" wins on plain T-shirts.
// Tuned on real closet photos; check changes with a few before shipping.
export const GARMENTS: Garment[] = [
  { category: "top", subcategory: "T-shirt", prompt: "a short sleeve t-shirt", formality: "casual", warmth: ["hot", "warm"] },
  { category: "top", subcategory: "Polo", prompt: "a polo shirt with a collar and buttons", formality: "casual", warmth: ["hot", "warm"] },
  { category: "top", subcategory: "Henley", prompt: "a henley shirt", formality: "casual", warmth: ["warm", "mild"] },
  { category: "top", subcategory: "Shirt", prompt: "a button-up shirt", formality: "smart", warmth: ["warm", "mild"] },
  { category: "top", subcategory: "Blouse", prompt: "a blouse", formality: "smart", warmth: ["warm", "mild"] },
  { category: "top", subcategory: "Long sleeve", prompt: "a long sleeve top", formality: "casual", warmth: ["mild"] },
  { category: "top", subcategory: "Tank", prompt: "a sleeveless tank top", formality: "casual", warmth: ["hot"] },
  { category: "top", subcategory: "Crop top", prompt: "a crop top", formality: "casual", warmth: ["hot", "warm"] },
  { category: "bottom", subcategory: "Jeans", prompt: "a pair of denim jeans", formality: "casual", warmth: ["warm", "mild", "cold"] },
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
const MIN_CONFIDENCE = 0.3;

const best = (scored: Scored) => [...scored].sort((a, b) => b.score - a.score)[0];

/** Picks the category whose prompts score best on average (geometric mean), as a 0–1 share. */
async function pickCategory(classify: Classifier, pixels: Pixels) {
  const prompts = Object.values(CATEGORY_PROMPTS).flat();
  const scored = await classify(pixels, prompts, { hypothesis_template: "a photo of {}" });
  const score = new Map(scored.map((s) => [s.label, s.score]));
  const logs = Object.entries(CATEGORY_PROMPTS).map(([category, ps]) => ({
    category,
    log: ps.reduce((sum, p) => sum + Math.log(Math.max(score.get(p) ?? 0, 1e-9)), 0) / ps.length,
  }));
  const max = Math.max(...logs.map((l) => l.log));
  const total = logs.reduce((sum, l) => sum + Math.exp(l.log - max), 0);
  const top = logs.reduce((a, b) => (b.log > a.log ? b : a));
  return { category: top.category, confidence: 1 / total };
}

export async function tagPhotoLocally(image: Buffer, colors: string[], classify?: Classifier): Promise<Tags> {
  if (!classify) {
    classifier ??= loadClassifier().catch((err) => {
      classifier = undefined; // allow a retry later, e.g. after going back online
      throw new Error(`Couldn't load the free tagging model (${err instanceof Error ? err.message : err})`);
    });
    classify = await classifier;
  }

  // Show CLIP the whole garment, centred on white in a square as in product
  // shots. CLIP crops to a square, which would cut off a tall photo's collar.
  const { data, info } = await sharp(image)
    .flatten({ background: "#ffffff" })
    .trim({ threshold: 10 })
    .resize(400, 400, { fit: "contain", background: "#ffffff" })
    .extend({ top: 24, bottom: 24, left: 24, right: 24, background: "#ffffff" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels: Pixels = { data, width: info.width, height: info.height };

  const { category, confidence } = await pickCategory(classify, pixels);
  const options = GARMENTS.filter((g) => g.category === category);
  const kind = best(await classify(pixels, options.map((g) => g.prompt), { hypothesis_template: "a product photo of {}" }));
  const garment = options.find((g) => g.prompt === kind?.label);
  if (!garment || confidence < MIN_CONFIDENCE) {
    return { name: "", category: "uncategorized", subcategory: "", colors, pattern: "", formality: "", warmth: [], styles: [] };
  }

  let pattern = garment.subcategory === "Jeans" ? "Denim wash" : "Solid";
  if (pattern === "Solid") {
    const scored = await classify(pixels, PATTERNS.map((x) => x.prompt), { hypothesis_template: "a close-up of {}" });
    const p = best(scored);
    // Patterns are easy to over-call; only accept a confident one. A small
    // logo or neck label reads as "graphic", so that needs extra certainty.
    const found = PATTERNS.find((x) => x.prompt === p?.label)?.pattern;
    if (found && p.score >= (found === "Graphic" ? 0.7 : 0.5)) pattern = found;
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
