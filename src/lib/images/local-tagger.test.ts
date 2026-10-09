import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { GARMENTS, nameFor, tagPhotoLocally } from "./local-tagger";

const photo = () => sharp({ create: { width: 40, height: 40, channels: 4, background: "#2f5fb3" } }).png().toBuffer();

// Stand-in for CLIP: answers with fixed scores for whichever labels it's given.
const fake = (garment: string, garmentScore: number, pattern = "plain solid-colored fabric", patternScore = 0.9) =>
  async (_img: unknown, labels: string[]) =>
    labels.map((label) => ({
      label,
      score: label === garment ? garmentScore : label === pattern ? patternScore : 0.01,
    }));

test("names and tags a confidently recognised piece", async () => {
  const tags = await tagPhotoLocally(await photo(), ["blue"], fake("a t-shirt", 0.8));
  assert.equal(tags.name, "Blue T-shirt");
  assert.equal(tags.category, "top");
  assert.equal(tags.subcategory, "T-shirt");
  assert.equal(tags.pattern, "Solid");
  assert.deepEqual(tags.warmth, ["hot", "warm"]);
});

test("jeans are denim, and the type is lower-cased in the name", async () => {
  const tags = await tagPhotoLocally(await photo(), ["navy"], fake("a pair of jeans", 0.6));
  assert.equal(tags.name, "Navy jeans");
  assert.equal(tags.pattern, "Denim wash");
});

test("only a confident pattern is used", async () => {
  const striped = await tagPhotoLocally(await photo(), ["white"], fake("a button-up shirt", 0.7, "striped fabric", 0.7));
  assert.equal(striped.pattern, "Striped");
  const unsure = await tagPhotoLocally(await photo(), ["white"], fake("a button-up shirt", 0.7, "striped fabric", 0.3));
  assert.equal(unsure.pattern, "Solid");
});

test("a low-confidence guess leaves the piece for the owner to tag", async () => {
  const tags = await tagPhotoLocally(await photo(), ["blue"], fake("a hat", 0.05));
  assert.equal(tags.category, "uncategorized");
  assert.equal(tags.name, "");
});

test("every garment prompt is unique and maps to a real category", () => {
  assert.equal(new Set(GARMENTS.map((g) => g.prompt)).size, GARMENTS.length);
  assert.equal(nameFor("Boots", "lightblue"), "Light blue boots");
  assert.equal(nameFor("Boots"), "Boots");
});
