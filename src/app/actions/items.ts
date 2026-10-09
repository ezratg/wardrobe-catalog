"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/dal";
import { retry } from "@/lib/images/pipeline";
import { deleteItemImages } from "@/lib/images/storage";
import { CATEGORIES, COLORS, FORMALITY, LAUNDRY, STYLES, WARMTH } from "@/lib/taxonomy";

const ids = <T extends readonly { id: string }[]>(arr: T) => arr.map((x) => x.id) as [string, ...string[]];
const optional = (s: z.ZodString) => s.trim().max(120).transform((v) => v || null);

const ItemSchema = z.object({
  name: z.string().trim().max(120),
  category: z.enum(ids(CATEGORIES)),
  subcategory: optional(z.string()),
  colors: z.array(z.enum(ids(COLORS))).max(5),
  pattern: optional(z.string()),
  styles: z.array(z.enum(STYLES as unknown as [string, ...string[]])).max(6),
  warmth: z.array(z.enum(ids(WARMTH))),
  formality: z.union([z.enum(ids(FORMALITY)), z.literal("")]).transform((v) => v || null),
  laundry: z.enum(ids(LAUNDRY)),
  brand: optional(z.string()),
  size: optional(z.string()),
  notes: z.string().trim().max(1000).transform((v) => v || null),
});

export type SaveState = { error?: string; saved?: boolean } | undefined;

export async function saveItem(itemId: string, _prev: SaveState, form: FormData): Promise<SaveState> {
  const user = await requireUser();
  const parsed = ItemSchema.safeParse({
    name: form.get("name") ?? "",
    category: form.get("category"),
    subcategory: form.get("subcategory") ?? "",
    colors: form.getAll("colors"),
    pattern: form.get("pattern") ?? "",
    styles: form.getAll("styles"),
    warmth: form.getAll("warmth"),
    formality: form.get("formality") ?? "",
    laundry: form.get("laundry") ?? "clean",
    brand: form.get("brand") ?? "",
    size: form.get("size") ?? "",
    notes: form.get("notes") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const res = db
    .update(schema.items)
    .set({ ...parsed.data, colorsConfirmed: true })
    .where(and(eq(schema.items.id, itemId), eq(schema.items.ownerId, user.id)))
    .run();
  if (!res.changes) return { error: "Item not found" };
  revalidatePath("/");
  revalidatePath(`/items/${itemId}`);
  return { saved: true };
}

export async function toggleFavorite(itemId: string) {
  const user = await requireUser();
  db.update(schema.items)
    .set({ favorite: sql`NOT ${schema.items.favorite}` })
    .where(and(eq(schema.items.id, itemId), eq(schema.items.ownerId, user.id)))
    .run();
  revalidatePath("/");
  revalidatePath(`/items/${itemId}`);
}

export async function markWorn(itemId: string) {
  const user = await requireUser();
  db.update(schema.items)
    .set({ wearCount: sql`${schema.items.wearCount} + 1`, lastWornAt: new Date(), laundry: "worn" })
    .where(and(eq(schema.items.id, itemId), eq(schema.items.ownerId, user.id)))
    .run();
  revalidatePath("/");
  revalidatePath(`/items/${itemId}`);
}

export async function retryBackground(itemId: string) {
  const user = await requireUser();
  retry(user.id, itemId);
  revalidatePath(`/items/${itemId}`);
}

export async function deleteItem(itemId: string) {
  const user = await requireUser();
  const res = db
    .delete(schema.items)
    .where(and(eq(schema.items.id, itemId), eq(schema.items.ownerId, user.id)))
    .run();
  if (res.changes) await deleteItemImages(user.id, itemId);
  revalidatePath("/");
  redirect("/");
}
