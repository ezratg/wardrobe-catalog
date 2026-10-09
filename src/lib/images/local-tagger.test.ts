import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { CATEGORY_PROMPTS, GARMENTS, nameFor, tagPhotoLocally } from "./local-tagger";

const photo = () => sharp({ create: { width: 40, height: 40, channels: 4, background: "#2f5fb3" } }).png().toBuffer();

// Stand-in for CLIP: answers with fixed scores for whichever labels it's given.
// `category` names the category whose prompts all score high.
const fake = (category: string, garment: string, categoryScore = 0.8, pattern = "plain solid-colored fabric", patternScore = 0.9) =>
  async (_img: unknown, labels: string[]) =>
    labels.map((label) => ({
      label,
      score:
        label === pattern ? patternScore
        : label === garment || CATEGORY_PROMPTS[category]?.includes(label) ? categoryScore
        : 0.01,
    }));

test("names and tags a confidently recognised piece", async () => {
  const tags = await tagPhotoLocally(await photo(), ["blue"], fake("top", "a short sleeve t-shirt"));
  assert.equal(tags.name, "Blue T-shirt");
  assert.equal(tags.category, "top");
  assert.equal(tags.subcategory, "T-shirt");
  assert.equal(tags.pattern, "Solid");
  assert.deepEqual(tags.warmth, ["hot", "warm"]);
});

test("the type is only chosen from the detected category", async () => {
  // "a pair of sneakers" is also a shoe category prompt; within bottoms it isn't an option.
  const tags = await tagPhotoLocally(await photo(), ["navy"], fake("bottom", "a pair of denim jeans"));
  assert.equal(tags.category, "bottom");
  assert.equal(tags.subcategory, "Jeans");
});

test("jeans are denim, and the type is lower-cased in the name", async () => {
  const tags = await tagPhotoLocally(await photo(), ["navy"], fake("bottom", "a pair of denim jeans"));
  assert.equal(tags.name, "Navy jeans");
  assert.equal(tags.pattern, "Denim wash");
});

test("only a confident pattern is used, and a graphic needs more certainty", async () => {
  const shirt = (pattern: string, score: number) => fake("top", "a button-up shirt", 0.8, pattern, score);
  assert.equal((await tagPhotoLocally(await photo(), ["white"], shirt("striped fabric", 0.7))).pattern, "Striped");
  assert.equal((await tagPhotoLocally(await photo(), ["white"], shirt("striped fabric", 0.3))).pattern, "Solid");
  assert.equal((await tagPhotoLocally(await photo(), ["white"], shirt("fabric with a printed graphic or logo", 0.6))).pattern, "Solid");
  assert.equal((await tagPhotoLocally(await photo(), ["white"], shirt("fabric with a printed graphic or logo", 0.8))).pattern, "Graphic");
});

test("a low-confidence guess leaves the piece for the owner to tag", async () => {
  // Every label scores the same, so no category stands out.
  const unsure = async (_img: unknown, labels: string[]) => labels.map((label) => ({ label, score: 0.1 }));
  const tags = await tagPhotoLocally(await photo(), ["blue"], unsure);
  assert.equal(tags.category, "uncategorized");
  assert.equal(tags.name, "");
});

test("every garment prompt is unique and maps to a real category", () => {
  assert.equal(new Set(GARMENTS.map((g) => g.prompt)).size, GARMENTS.length);
  for (const g of GARMENTS) assert.ok(CATEGORY_PROMPTS[g.category], `${g.subcategory} has no category prompts`);
  for (const c of Object.keys(CATEGORY_PROMPTS)) assert.ok(GARMENTS.some((g) => g.category === c), `${c} has no types`);
  assert.equal(nameFor("Boots", "lightblue"), "Light blue boots");
  assert.equal(nameFor("Boots"), "Boots");
});
