import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Item } from "@/db/schema";
import { displayName, imageUrl } from "@/lib/items";
import { sortBySlot, type StyleItem } from "./engine";

/** What the browser needs to draw and style an item. */
export type ClientItem = StyleItem & { name: string; thumb: string };

export function toClientItem(i: Item): ClientItem {
  return {
    id: i.id, category: i.category, subcategory: i.subcategory, colors: i.colors, pattern: i.pattern,
    styles: i.styles, formality: i.formality, laundry: i.laundry, wearCount: i.wearCount, favorite: i.favorite,
    name: displayName(i), thumb: imageUrl(i, "thumb"),
  };
}

/** The owner's taggable closet (everything except items that still need a category). */
export function getStylableCloset(ownerId: string) {
  return db
    .select()
    .from(schema.items)
    .where(eq(schema.items.ownerId, ownerId))
    .orderBy(desc(schema.items.createdAt))
    .all()
    .filter((i) => i.category !== "uncategorized");
}

export function listOutfits(ownerId: string) {
  const outfits = db.select().from(schema.outfits).where(eq(schema.outfits.ownerId, ownerId)).orderBy(desc(schema.outfits.createdAt)).all();
  return attachItems(outfits);
}

export function getOutfit(ownerId: string, outfitId: string) {
  const o = db.select().from(schema.outfits).where(and(eq(schema.outfits.id, outfitId), eq(schema.outfits.ownerId, ownerId))).get();
  return o ? attachItems([o])[0] : undefined;
}

function attachItems<T extends { id: string }>(outfits: T[]) {
  if (!outfits.length) return [];
  const rows = db
    .select({ outfitId: schema.outfitItems.outfitId, item: schema.items })
    .from(schema.outfitItems)
    .innerJoin(schema.items, eq(schema.items.id, schema.outfitItems.itemId))
    .where(inArray(schema.outfitItems.outfitId, outfits.map((o) => o.id)))
    .orderBy(asc(schema.outfitItems.position))
    .all();
  return outfits.map((o) => ({
    ...o,
    items: sortBySlot(rows.filter((r) => r.outfitId === o.id).map((r) => r.item)),
  }));
}
