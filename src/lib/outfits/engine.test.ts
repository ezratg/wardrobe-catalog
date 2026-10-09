import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreOutfit, suggestOutfits, type StyleItem } from "./engine";

let n = 0;
const item = (category: string, color: string, extra: Partial<StyleItem> = {}): StyleItem => ({
  id: `${category}-${color}-${n++}`, category, colors: [color], styles: [], laundry: "clean", wearCount: 0, favorite: false, ...extra,
});

test("neutral top + bottom + shoes scores well with no warnings", () => {
  const s = scoreOutfit([item("top", "white"), item("bottom", "navy"), item("shoes", "black")]);
  assert.equal(s.warnings.length, 0);
  assert.ok(s.score >= 4, `score ${s.score}`);
  assert.ok(s.reasons.some((r) => r.includes("Navy and white")));
});

test("clashing accents and two patterns are flagged", () => {
  const s = scoreOutfit([
    item("top", "orange", { pattern: "Floral" }),
    item("bottom", "purple", { pattern: "Plaid" }),
    item("shoes", "white"),
  ]);
  assert.ok(s.warnings.some((w) => w.includes("clash")));
  assert.ok(s.warnings.some((w) => w.includes("patterns")));
});

test("missing pieces are pointed out", () => {
  const s = scoreOutfit([item("top", "white")]);
  assert.ok(s.warnings.includes("Add a bottom to finish the look"));
  assert.ok(s.warnings.includes("Add shoes"));
});

test("far-apart dress codes are penalised", () => {
  const casual = scoreOutfit([item("top", "white", { formality: "lounge" }), item("bottom", "black", { formality: "formal" })]);
  assert.ok(casual.warnings.some((w) => w.includes("far apart")));
});

test("suggestions are complete, skip laundry, and respect the anchor item", () => {
  const red = item("top", "red");
  const closet = [
    red, item("top", "white"), item("top", "black", { laundry: "laundry" }),
    item("bottom", "navy"), item("bottom", "beige"),
    item("dress", "green"),
    item("shoes", "white"), item("shoes", "brown"),
    item("outerwear", "beige"), item("bag", "black"),
  ];
  const { suggestions, missing } = suggestOutfits(closet, { count: 4 });
  assert.equal(missing.length, 0);
  assert.ok(suggestions.length >= 3);
  for (const s of suggestions) {
    assert.ok(!s.itemIds.some((id) => id.startsWith("top-black")), "laundry item suggested");
    assert.ok(s.itemIds.some((id) => id.startsWith("shoes")), "no shoes");
  }
  const anchored = suggestOutfits(closet, { withItemId: red.id, count: 3 });
  assert.ok(anchored.suggestions.length > 0);
  for (const s of anchored.suggestions) assert.ok(s.itemIds.includes(red.id));
});

test("reports what's missing when there's nothing to build from", () => {
  const { suggestions, missing } = suggestOutfits([item("top", "white")]);
  assert.equal(suggestions.length, 0);
  assert.deepEqual(missing, ["bottoms"]);
});

test("formality filter keeps pieces within one step", () => {
  const closet = [
    item("top", "white", { formality: "business" }), item("top", "grey", { formality: "lounge" }),
    item("bottom", "navy", { formality: "business" }), item("shoes", "black", { formality: "smart" }),
  ];
  const { suggestions } = suggestOutfits(closet, { formality: "business" });
  assert.ok(suggestions.length > 0);
  for (const s of suggestions) assert.ok(!s.itemIds.some((id) => id.startsWith("top-grey")));
});
