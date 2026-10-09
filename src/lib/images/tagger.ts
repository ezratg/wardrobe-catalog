import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { CATEGORIES, COLORS, FORMALITY, PATTERNS, STYLES, SUBCATEGORIES, WARMTH } from "@/lib/taxonomy";

/**
 * Auto-tagging. By default it runs free on this machine (see local-tagger.ts).
 * If ANTHROPIC_API_KEY is set, Claude's vision is used instead: more precise
 * names plus style tags, billed to that API account. AUTO_TAG=off disables both.
 */
export function taggerEnabled() {
  return process.env.AUTO_TAG !== "off";
}

export function claudeTaggerEnabled() {
  return taggerEnabled() && Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

// Claude-based tagging: looks at the cut-out photo and fills in name, category,
// type, colours, pattern, dress code, weather and style. Each photo is one small
// request (image downscaled to 512px). Set AUTO_TAG_MODEL to use a different model.

const MODEL = process.env.AUTO_TAG_MODEL || "claude-opus-5-5";

export type Tags = {
  name: string;
  category: string;
  subcategory: string;
  colors: string[];
  pattern: string;
  formality: string;
  warmth: string[];
  styles: string[];
};

const ids = <T extends readonly { id: string }[]>(arr: T) => arr.map((x) => x.id);

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "category", "subcategory", "colors", "pattern", "formality", "warmth", "styles"],
  properties: {
    name: { type: "string", description: "Short catalog-style name, 2-4 words, e.g. 'Navy linen shirt'. Empty if no clothing is visible." },
    category: { type: "string", enum: ids(CATEGORIES) },
    subcategory: { type: "string", description: "Garment type, preferably one of the suggested types for the category" },
    colors: { type: "array", items: { type: "string", enum: ids(COLORS) }, description: "Main colours, most prominent first, 1-3" },
    pattern: { type: "string", enum: [...PATTERNS] },
    formality: { type: "string", enum: ids(FORMALITY) },
    warmth: { type: "array", items: { type: "string", enum: ids(WARMTH) }, description: "Weather the piece suits" },
    styles: { type: "array", items: { type: "string", enum: [...STYLES] }, description: "0-3 style tags that clearly fit" },
  },
};

const SYSTEM = `You tag photos of clothing for a personal wardrobe catalog. Each photo shows one piece, usually with the background already removed.

Fill every field from what's visible. Pick the category for the main garment. Use "uncategorized" and an empty name only if the photo shows no clothing, shoes, bag or accessory.

Suggested types per category:
${Object.entries(SUBCATEGORIES).map(([c, subs]) => `- ${c}: ${subs!.join(", ")}`).join("\n")}

Weather: hot = 25°C+, warm = 18–25°C, mild = 10–18°C, cold = under 10°C. A T-shirt is hot/warm; a wool coat is cold; jeans are warm/mild/cold.
Name: lead with the colour and finish with the type, e.g. "Black leather boots", "Cream cable-knit sweater". Mention a visible brand only if it's clearly printed.`;

let client: Anthropic | undefined;

export async function tagPhoto(image: Buffer): Promise<Tags> {
  client ??= new Anthropic();
  const jpeg = await sharp(image)
    .resize(512, 512, { fit: "inside" })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 85 })
    .toBuffer();

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    // Classification is simple; low effort keeps it fast and cheap.
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    // If a safety classifier declines, Anthropic retries on a recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } },
          { type: "text", text: "Tag this piece." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("The photo couldn't be tagged automatically");
  if (response.stop_reason === "max_tokens") throw new Error("Tagging response was cut off");
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No tags returned");
  return sanitize(JSON.parse(text.text));
}

// Keep only known values, so a surprising answer can never put junk in the catalog.
function sanitize(raw: Partial<Tags>): Tags {
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback;
  const many = (v: unknown, allowed: readonly string[], max: number) =>
    [...new Set(Array.isArray(v) ? v.filter((x) => allowed.includes(x)) : [])].slice(0, max);
  return {
    name: String(raw.name ?? "").trim().slice(0, 80),
    category: pick(raw.category, ids(CATEGORIES), "uncategorized"),
    subcategory: String(raw.subcategory ?? "").trim().slice(0, 60),
    colors: many(raw.colors, ids(COLORS), 3),
    pattern: pick(raw.pattern, [...PATTERNS], "Solid"),
    formality: pick(raw.formality, ids(FORMALITY), "casual"),
    warmth: many(raw.warmth, ids(WARMTH), 4),
    styles: many(raw.styles, [...STYLES], 3),
  };
}
