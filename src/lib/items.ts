import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Item } from "@/db/schema";

import { SORTS, type CatalogFilters } from "./sorts";

export { SORTS, type CatalogFilters };

type Params = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).flatMap((s) => s.split(",")).filter(Boolean);

export function parseFilters(sp: Params): CatalogFilters {
  const sort = typeof sp.sort === "string" && SORTS.some((s) => s.id === sp.sort) ? sp.sort : "newest";
  return {
    q: typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : undefined,
    category: list(sp.category),
    color: list(sp.color),
    warmth: list(sp.warmth),
    style: list(sp.style),
    laundry: list(sp.laundry),
    favorites: sp.favorites === "1",
    sort: sort as CatalogFilters["sort"],
  };
}

/** Serialize filters back to a query string, optionally toggling one value. */
export function filtersToQuery(f: CatalogFilters, toggle?: { key: keyof CatalogFilters; value: string }) {
  const next: CatalogFilters = { ...f, category: [...f.category], color: [...f.color], warmth: [...f.warmth], style: [...f.style], laundry: [...f.laundry] };
  if (toggle) {
    const { key, value } = toggle;
    if (key === "favorites") next.favorites = !next.favorites;
    else if (key === "sort") next.sort = value as CatalogFilters["sort"];
    else if (key === "q") next.q = value || undefined;
    else {
      const arr = next[key] as string[];
      const i = arr.indexOf(value);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(value);
    }
  }
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  for (const k of ["category", "color", "warmth", "style", "laundry"] as const) if (next[k].length) p.set(k, next[k].join(","));
  if (next.favorites) p.set("favorites", "1");
  if (next.sort !== "newest") p.set("sort", next.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function activeFilterCount(f: CatalogFilters) {
  return f.category.length + f.color.length + f.warmth.length + f.style.length + f.laundry.length + (f.favorites ? 1 : 0) + (f.q ? 1 : 0);
}

function matches(item: Item, f: CatalogFilters, skip?: keyof CatalogFilters) {
  const any = (want: string[], have: string[]) => !want.length || want.some((w) => have.includes(w));
  if (f.q && skip !== "q") {
    const hay = [item.name, item.brand, item.subcategory, item.notes, item.pattern, ...item.styles].join(" ").toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).every((t) => hay.includes(t))) return false;
  }
  return (
    (skip === "category" || any(f.category, [item.category])) &&
    (skip === "color" || any(f.color, item.colors)) &&
    (skip === "warmth" || any(f.warmth, item.warmth)) &&
    (skip === "style" || any(f.style, item.styles)) &&
    (skip === "laundry" || any(f.laundry, [item.laundry])) &&
    (skip === "favorites" || !f.favorites || item.favorite)
  );
}

function sortItems(items: Item[], sort: CatalogFilters["sort"]) {
  const by = {
    newest: (a: Item, b: Item) => +b.createdAt - +a.createdAt,
    oldest: (a: Item, b: Item) => +a.createdAt - +b.createdAt,
    "most-worn": (a: Item, b: Item) => b.wearCount - a.wearCount,
    "least-worn": (a: Item, b: Item) => a.wearCount - b.wearCount,
    name: (a: Item, b: Item) => (a.name || "~").localeCompare(b.name || "~"),
  }[sort];
  return [...items].sort(by);
}

/**
 * A closet is at most a few thousand rows, so we load the owner's items once
 * and filter in memory. That keeps tag arrays simple (JSON columns) and lets
 * us compute facet counts like a shopping site does.
 */
export function queryCatalog(ownerId: string, f: CatalogFilters) {
  const all = db.select().from(schema.items).where(eq(schema.items.ownerId, ownerId)).orderBy(desc(schema.items.createdAt)).all();
  const results = sortItems(all.filter((i) => matches(i, f)), f.sort);

  // Facet counts: how many items each option would show, given the other active filters.
  const facet = (key: "category" | "color" | "warmth" | "style" | "laundry", values: (i: Item) => string[]) => {
    const counts: Record<string, number> = {};
    for (const i of all) if (matches(i, f, key)) for (const v of values(i)) counts[v] = (counts[v] ?? 0) + 1;
    return counts;
  };
  return {
    total: all.length,
    results,
    facets: {
      category: facet("category", (i) => [i.category]),
      color: facet("color", (i) => i.colors),
      warmth: facet("warmth", (i) => i.warmth),
      style: facet("style", (i) => i.styles),
      laundry: facet("laundry", (i) => [i.laundry]),
    },
  };
}

export function getItem(ownerId: string, itemId: string) {
  return db
    .select()
    .from(schema.items)
    .where(and(eq(schema.items.id, itemId), eq(schema.items.ownerId, ownerId)))
    .get();
}

export function imageUrl(item: Pick<Item, "id" | "imageVersion">, variant: "thumb" | "cutout" | "original") {
  return `/api/images/${item.id}/${variant}?v=${item.imageVersion}`;
}

export function displayName(item: Pick<Item, "name" | "subcategory" | "category">) {
  if (item.name) return item.name;
  if (item.subcategory) return item.subcategory;
  return item.category === "uncategorized" ? "Untitled item" : item.category[0].toUpperCase() + item.category.slice(1);
}
