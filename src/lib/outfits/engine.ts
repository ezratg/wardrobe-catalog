// Rule-based outfit styling. Pure functions with no I/O, so they run on the
// server (suggestions) and in the browser (live style check in the builder).
//
// An outfit is scored on a handful of common styling guidelines:
//  • structure: a dress, or a top with a bottom, plus shoes; optional layers
//  • colour: neutrals go with anything; at most one or two accent colours,
//    ideally close on the colour wheel (tonal) or opposite (complementary)
//  • pattern: one statement pattern at a time
//  • dress code: pieces within one formality step of each other
//  • style: pieces that share a style tag feel intentional
// Each rule adds or subtracts points and explains itself in plain words.

export type StyleItem = {
  id: string;
  category: string;
  subcategory?: string | null;
  colors: string[];
  pattern?: string | null;
  styles: string[];
  formality?: string | null;
  laundry: string;
  wearCount: number;
  favorite: boolean;
};

export type Slot = "outer" | "mid" | "top" | "dress" | "bottom" | "shoes" | "bag" | "accessory";

export const SLOT_OF: Record<string, Slot | undefined> = {
  outerwear: "outer",
  knitwear: "mid",
  top: "top",
  activewear: "top",
  dress: "dress",
  bottom: "bottom",
  shoes: "shoes",
  bag: "bag",
  accessory: "accessory",
};

export const SLOT_ORDER: Slot[] = ["outer", "mid", "top", "dress", "bottom", "shoes", "bag", "accessory"];

const FORMALITY_LEVEL: Record<string, number> = { lounge: 0, casual: 1, smart: 2, business: 3, formal: 4 };

export const NEUTRALS = new Set(["black", "white", "cream", "grey", "beige", "brown", "navy", "olive"]);
const HUE: Record<string, number> = {
  red: 2, burgundy: 350, pink: 340, orange: 25, yellow: 50,
  green: 135, lightblue: 205, blue: 220, purple: 275,
};
const CLASSIC_PAIRS: [string, string, string][] = [
  ["navy", "white", "Navy and white is a classic pairing"],
  ["navy", "cream", "Navy and cream is a classic pairing"],
  ["black", "white", "Black and white is crisp and timeless"],
  ["beige", "white", "Beige and white feels light and polished"],
  ["beige", "navy", "Camel and navy is a classic pairing"],
  ["olive", "cream", "Olive and cream is an easy earthy mix"],
  ["grey", "navy", "Grey and navy is understated and smart"],
  ["brown", "cream", "Brown and cream is warm and relaxed"],
];
const SOFT_CLASHES: [string, string, string][] = [
  ["black", "navy", "Black and navy can read as a near-miss; add a lighter piece to separate them"],
  ["black", "brown", "Black and brown together can look muddy"],
];

const label = (c: string) => (c === "lightblue" ? "light blue" : c);
const isPatterned = (p?: string | null) => Boolean(p && p !== "Solid" && p !== "Denim wash");
const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

export type Score = { score: number; reasons: string[]; warnings: string[] };

/** Score any set of items as an outfit. Used for suggestions and the builder's style check. */
export function scoreOutfit(items: StyleItem[]): Score {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 0;
  const slots = items.map((i) => SLOT_OF[i.category]);
  const has = (s: Slot) => slots.includes(s);

  // Structure
  if (has("dress") && (has("top") || has("bottom"))) {
    warnings.push("A dress usually doesn't need a separate top or bottom");
    score -= 2;
  } else if (has("dress") || (has("top") && has("bottom"))) {
    score += 2;
  } else if (items.length) {
    warnings.push(has("top") ? "Add a bottom to finish the look" : has("bottom") ? "Add a top to finish the look" : "Start with a top and bottom, or a dress");
  }
  if (items.length && !has("shoes")) warnings.push("Add shoes");
  for (const s of SLOT_ORDER) {
    const n = slots.filter((x) => x === s).length;
    if (n > 1 && s !== "accessory") {
      warnings.push(`Two ${s === "mid" ? "knit layers" : s === "outer" ? "jackets" : s + "s"} in one outfit`);
      score -= 1.5;
    }
  }

  // Colour, using each piece's main colour
  const main = [...new Set(items.map((i) => i.colors[0]).filter(Boolean))];
  const accents = main.filter((c) => !NEUTRALS.has(c));
  if (main.length === 1 && items.length > 1) {
    score += 1.5;
    reasons.push(`Head-to-toe ${label(main[0])} looks deliberate`);
  } else if (accents.length === 0 && main.length) {
    score += 2;
    reasons.push("An all-neutral palette is easy to pull off");
  } else if (accents.length === 1) {
    score += 2.5;
    reasons.push(`One pop of ${label(accents[0])} against neutrals`);
  } else if (accents.length === 2) {
    const gap = hueGap(HUE[accents[0]], HUE[accents[1]]);
    if (gap <= 45) {
      score += 2;
      reasons.push(`${cap(label(accents[0]))} and ${label(accents[1])} sit next to each other on the colour wheel`);
    } else if (gap >= 140) {
      score += 1;
      reasons.push(`${cap(label(accents[0]))} and ${label(accents[1])} are complementary, a bold contrast`);
    } else {
      score -= 2;
      warnings.push(`${cap(label(accents[0]))} and ${label(accents[1])} may clash`);
    }
  } else if (accents.length > 2) {
    score -= 3;
    warnings.push("More than two bright colours; try swapping one for a neutral");
  }
  for (const [a, b, why] of CLASSIC_PAIRS) {
    if (main.includes(a) && main.includes(b)) {
      score += 1;
      reasons.push(why);
      break;
    }
  }
  for (const [a, b, why] of SOFT_CLASHES) {
    if (main.includes(a) && main.includes(b) && !main.some((c) => ["white", "cream", "grey", "beige"].includes(c))) {
      score -= 1;
      warnings.push(why);
    }
  }

  // Pattern
  const patterned = items.filter((i) => isPatterned(i.pattern));
  if (patterned.length > 1) {
    score -= 2.5;
    warnings.push("Two patterns compete for attention");
  } else if (patterned.length === 1 && items.length > 1) {
    score += 0.5;
    reasons.push(`The ${patterned[0].pattern!.toLowerCase()} piece is the focal point`);
  }

  // Dress code
  const levels = items.map((i) => (i.formality ? FORMALITY_LEVEL[i.formality] : undefined)).filter((l): l is number => l !== undefined);
  if (levels.length >= 2) {
    const spread = Math.max(...levels) - Math.min(...levels);
    if (spread <= 1) score += 1;
    else if (spread === 2) {
      score -= 1;
      warnings.push("Mixes casual and dressy pieces; fine if intentional");
    } else {
      score -= 3;
      warnings.push("The dress codes are far apart");
    }
  }

  // Shared style
  const styleCounts = new Map<string, number>();
  for (const i of items) for (const s of i.styles) styleCounts.set(s, (styleCounts.get(s) ?? 0) + 1);
  const shared = [...styleCounts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0];
  if (shared) {
    score += 1;
    reasons.push(`Pieces share a ${shared[0].toLowerCase()} feel`);
  }

  // Practicalities
  const dirty = items.filter((i) => i.laundry === "laundry");
  if (dirty.length) {
    score -= 5;
    warnings.push(dirty.length === 1 ? "One piece is in the laundry" : `${dirty.length} pieces are in the laundry`);
  }
  score += items.filter((i) => i.favorite).length * 0.3;

  return { score: round(score), reasons, warnings };
}

export type SuggestOptions = {
  formality?: string;
  style?: string;
  /** Build every suggestion around this item. */
  withItemId?: string;
  count?: number;
  seed?: number;
};

export type Suggestion = { itemIds: string[]; score: number; reasons: string[]; warnings: string[] };

export function suggestOutfits(closet: StyleItem[], opts: SuggestOptions = {}): { suggestions: Suggestion[]; missing: string[] } {
  const rand = mulberry32(opts.seed ?? 1);
  const count = opts.count ?? 6;
  const target = opts.formality ? FORMALITY_LEVEL[opts.formality] : undefined;
  const anchor = opts.withItemId ? closet.find((i) => i.id === opts.withItemId) : undefined;

  const usable = closet.filter((i) => {
    if (i.id === anchor?.id) return true;
    if (i.laundry === "laundry" || !SLOT_OF[i.category]) return false;
    if (target !== undefined && i.formality && Math.abs(FORMALITY_LEVEL[i.formality] - target) > 1) return false;
    return true;
  });
  const bySlot = (s: Slot) => usable.filter((i) => SLOT_OF[i.category] === s);
  const tops = bySlot("top"), bottoms = bySlot("bottom"), dresses = bySlot("dress");

  const missing: string[] = [];
  if (!dresses.length && (!tops.length || !bottoms.length)) {
    if (!tops.length) missing.push("tops");
    if (!bottoms.length) missing.push("bottoms");
    return { suggestions: [], missing };
  }
  if (!bySlot("shoes").length) missing.push("shoes");

  // Small preference nudges that aren't style rules: the chosen style, wearing
  // under-used pieces, and a little randomness so "shuffle" gives new ideas.
  const nudge = (items: StyleItem[]) =>
    items.reduce((s, i) => s + (opts.style && i.styles.includes(opts.style) ? 1 : 0) - Math.min(i.wearCount, 20) * 0.03, 0) + rand() * 1.5;
  const evaluate = (items: StyleItem[]) => {
    const s = scoreOutfit(items);
    return { items, ...s, total: s.score + nudge(items) };
  };

  // 1. Every base: top + bottom, or a dress
  let bases = [
    ...tops.flatMap((t) => bottoms.map((b) => [t, b])),
    ...dresses.map((d) => [d]),
  ];
  if (anchor) {
    const slot = SLOT_OF[anchor.category];
    if (slot === "top" || slot === "bottom" || slot === "dress") bases = bases.filter((b) => b.includes(anchor));
    else bases = bases.map((b) => [...b, anchor]);
  }
  if (opts.style) {
    // When a style is chosen, at least one main piece should carry it.
    const styled = bases.filter((b) => b.some((i) => i.styles.includes(opts.style!)));
    if (styled.length) bases = styled;
  }
  const ranked = bases.map(evaluate).sort((a, b) => b.total - a.total).slice(0, 40);

  // 2. Finish each base greedily: shoes, then an optional layer, bag, accessory
  const finish = (start: StyleItem[]) => {
    let best = evaluate(start);
    const add = (slot: Slot, required: boolean) => {
      if (best.items.some((i) => SLOT_OF[i.category] === slot)) return;
      const options = bySlot(slot).map((o) => evaluate([...best.items, o]));
      if (!options.length) return;
      const top = options.sort((a, b) => b.total - a.total)[0];
      if (required || top.score > best.score) best = top;
    };
    add("shoes", true);
    // A layer is optional; only add one that keeps the outfit as good or better.
    const layerSlot: Slot = target !== undefined && target >= 2 ? "outer" : rand() < 0.5 ? "outer" : "mid";
    add(layerSlot, false);
    add("bag", false);
    add("accessory", false);
    return best;
  };

  // 3. Pick a varied set: avoid reusing the same piece too often
  const used = new Map<string, number>();
  const out: Suggestion[] = [];
  for (const cand of ranked.map((b) => finish(b.items)).sort((a, b) => b.total - a.total)) {
    if (out.length >= count) break;
    const overused = cand.items.some((i) => i.id !== anchor?.id && (used.get(i.id) ?? 0) >= 2);
    const duplicate = out.some((o) => o.itemIds.length === cand.items.length && cand.items.every((i) => o.itemIds.includes(i.id)));
    if (overused || duplicate) continue;
    cand.items.forEach((i) => used.set(i.id, (used.get(i.id) ?? 0) + 1));
    out.push({ itemIds: sortBySlot(cand.items).map((i) => i.id), score: cand.score, reasons: cand.reasons, warnings: cand.warnings });
  }
  return { suggestions: out, missing };
}

export function sortBySlot<T extends { category: string }>(items: T[]): T[] {
  const rank = (i: T) => SLOT_ORDER.indexOf(SLOT_OF[i.category] ?? "accessory");
  return [...items].sort((a, b) => rank(a) - rank(b));
}

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}
function round(n: number) {
  return Math.round(n * 10) / 10;
}
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
