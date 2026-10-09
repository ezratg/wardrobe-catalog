"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/dal";

const OutfitSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().max(120),
  occasion: z.string().trim().max(120),
  itemIds: z.array(z.string()).min(1, "Add at least one piece").max(12),
});

export async function saveOutfit(input: z.input<typeof OutfitSchema>): Promise<{ error: string } | void> {
  const user = await requireUser();
  const parsed = OutfitSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, name, occasion, itemIds } = parsed.data;

  const owned = db
    .select({ id: schema.items.id })
    .from(schema.items)
    .where(and(eq(schema.items.ownerId, user.id), inArray(schema.items.id, itemIds)))
    .all();
  if (owned.length !== new Set(itemIds).size) return { error: "Some of those pieces aren't in your closet any more" };

  const outfitId = db.transaction((tx) => {
    let oid = id;
    if (oid) {
      const res = tx
        .update(schema.outfits)
        .set({ name, occasion: occasion || null })
        .where(and(eq(schema.outfits.id, oid), eq(schema.outfits.ownerId, user.id)))
        .run();
      if (!res.changes) return null;
      tx.delete(schema.outfitItems).where(eq(schema.outfitItems.outfitId, oid)).run();
    } else {
      oid = tx
        .insert(schema.outfits)
        .values({ ownerId: user.id, createdById: user.id, name, occasion: occasion || null, source: "manual" })
        .returning({ id: schema.outfits.id })
        .get().id;
    }
    tx.insert(schema.outfitItems).values([...new Set(itemIds)].map((itemId, position) => ({ outfitId: oid!, itemId, position }))).run();
    return oid!;
  });
  if (!outfitId) return { error: "Outfit not found" };
  revalidatePath("/outfits");
  redirect(`/outfits/${outfitId}`);
}

export async function deleteOutfit(outfitId: string) {
  const user = await requireUser();
  db.delete(schema.outfits).where(and(eq(schema.outfits.id, outfitId), eq(schema.outfits.ownerId, user.id))).run();
  revalidatePath("/outfits");
  redirect("/outfits");
}

/** Log the outfit as worn today: stamps the outfit and bumps each piece's wear count. */
export async function wearOutfit(outfitId: string) {
  const user = await requireUser();
  const outfit = db.select().from(schema.outfits).where(and(eq(schema.outfits.id, outfitId), eq(schema.outfits.ownerId, user.id))).get();
  if (!outfit) return;
  const ids = db.select({ id: schema.outfitItems.itemId }).from(schema.outfitItems).where(eq(schema.outfitItems.outfitId, outfitId)).all().map((r) => r.id);
  const now = new Date();
  db.transaction((tx) => {
    tx.update(schema.outfits).set({ wornAt: now }).where(eq(schema.outfits.id, outfitId)).run();
    if (ids.length)
      tx.update(schema.items)
        .set({ wearCount: sql`${schema.items.wearCount} + 1`, lastWornAt: now, laundry: "worn" })
        .where(and(eq(schema.items.ownerId, user.id), inArray(schema.items.id, ids)))
        .run();
  });
  revalidatePath("/outfits");
  revalidatePath(`/outfits/${outfitId}`);
  revalidatePath("/");
}

/** Save a suggestion as-is (form post from the suggestions page). */
export async function saveSuggestion(form: FormData) {
  const itemIds = String(form.get("itemIds") ?? "").split(",").filter(Boolean);
  const res = await saveOutfit({ name: String(form.get("name") ?? ""), occasion: "", itemIds });
  if (res?.error) throw new Error(res.error);
}
