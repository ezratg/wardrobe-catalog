import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { and, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { removeBackground } from "./background";
import { detectColors } from "./colors";
import { readImage, writeImage } from "./storage";
import { tagPhotoLocally } from "./local-tagger";
import { claudeTaggerEnabled, tagPhoto, taggerEnabled } from "./tagger";

const MAX_EDGE = 2000;
const THUMB_EDGE = 640;

/** Normalise an upload (EXIF rotation, size cap, JPEG) and store it as the original + a provisional thumb. */
export async function storeOriginal(ownerId: string, itemId: string, upload: Buffer) {
  const original = await sharp(upload)
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 88 })
    .toBuffer();
  await writeImage(ownerId, itemId, "original", original);
  await writeImage(
    ownerId,
    itemId,
    "thumb",
    await sharp(original).resize(THUMB_EDGE, THUMB_EDGE, { fit: "inside" }).webp({ quality: 80 }).toBuffer(),
  );
}

async function processItem(itemId: string) {
  await removeItemBackground(itemId);
  await autoTagItem(itemId);
}

async function removeItemBackground(itemId: string) {
  const item = db.select().from(schema.items).where(eq(schema.items.id, itemId)).get();
  if (!item || (item.bgStatus !== "pending" && item.bgStatus !== "processing")) return;
  db.update(schema.items).set({ bgStatus: "processing", bgError: null }).where(eq(schema.items.id, itemId)).run();

  try {
    const original = await readImage(item.ownerId, itemId, "original");
    if (!original) throw new Error("Original photo is missing");

    const raw = await removeBackground(original.data);
    // Crop to the garment with a little breathing room, so cards line up nicely.
    const trimmed = await sharp(raw).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
    const pad = Math.round(Math.max(trimmed.info.width, trimmed.info.height) * 0.04);
    const cutout = await sharp(trimmed.data)
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const thumb = await sharp(cutout)
      .resize(THUMB_EDGE, THUMB_EDGE, { fit: "inside" })
      .webp({ quality: 82, alphaQuality: 90 })
      .toBuffer();

    await writeImage(item.ownerId, itemId, "cutout", cutout);
    await writeImage(item.ownerId, itemId, "thumb", thumb);

    const detected = item.colorsConfirmed ? null : await detectColors(cutout);
    db.update(schema.items)
      .set({
        bgStatus: "done",
        hasCutout: true,
        imageVersion: item.imageVersion + 1,
        ...(detected ? { colors: detected } : {}),
      })
      .where(eq(schema.items.id, itemId))
      .run();
  } catch (err) {
    console.error(`[bg] item ${itemId} failed`, err);
    db.update(schema.items)
      .set({ bgStatus: "failed", bgError: err instanceof Error ? err.message.slice(0, 300) : "Unknown error" })
      .where(eq(schema.items.id, itemId))
      .run();
  }
}

/** Fill in any tags the owner hasn't set yet, using the cut-out (or the original if removal failed). */
async function autoTagItem(itemId: string) {
  const item = db.select().from(schema.items).where(eq(schema.items.id, itemId)).get();
  if (!item || item.tagStatus !== "pending") return;
  if (!taggerEnabled()) {
    db.update(schema.items).set({ tagStatus: "off" }).where(eq(schema.items.id, itemId)).run();
    return;
  }
  try {
    const img = (item.hasCutout && (await readImage(item.ownerId, itemId, "cutout"))) || (await readImage(item.ownerId, itemId, "original"));
    if (!img) throw new Error("Photo is missing");
    const tags = claudeTaggerEnabled() ? await tagPhoto(img.data) : await tagPhotoLocally(img.data, item.colors);

    // Re-read: the owner may have edited the item while we were waiting.
    const now = db.select().from(schema.items).where(eq(schema.items.id, itemId)).get();
    if (!now) return;
    db.update(schema.items)
      .set({
        // "off" when the model couldn't tell what it is, so the owner is asked to tag it.
        tagStatus: tags.category === "uncategorized" && now.category === "uncategorized" ? "off" : "done",
        tagError: null,
        name: now.name || tags.name,
        category: now.category === "uncategorized" ? tags.category : now.category,
        subcategory: now.subcategory || tags.subcategory || null,
        pattern: now.pattern || tags.pattern || null,
        formality: now.formality || tags.formality || null,
        warmth: now.warmth.length ? now.warmth : tags.warmth,
        styles: now.styles.length ? now.styles : tags.styles,
        colors: now.colorsConfirmed || !tags.colors.length ? now.colors : tags.colors,
      })
      .where(eq(schema.items.id, itemId))
      .run();
  } catch (err) {
    console.error(`[tag] item ${itemId} failed`, err);
    db.update(schema.items)
      .set({ tagStatus: "failed", tagError: tagErrorMessage(err) })
      .where(eq(schema.items.id, itemId))
      .run();
  }
}

function tagErrorMessage(err: unknown) {
  if (err instanceof Anthropic.AuthenticationError) return "The Anthropic API key was rejected";
  if (err instanceof Anthropic.RateLimitError) return "Too many requests at once; try again shortly";
  if (err instanceof Anthropic.APIConnectionError) return "Couldn't reach the tagging service";
  if (err instanceof Anthropic.APIError) return `Tagging service error (${err.status})`;
  return err instanceof Error ? err.message.slice(0, 300) : "Unknown error";
}

/** Queue auto-tagging for an owner's items that still need a category. Returns how many were queued. */
export function autoTagUntagged(ownerId: string) {
  if (!taggerEnabled()) return 0;
  const rows = db
    .update(schema.items)
    .set({ tagStatus: "pending", tagError: null })
    .where(
      and(
        eq(schema.items.ownerId, ownerId),
        eq(schema.items.category, "uncategorized"),
        inArray(schema.items.tagStatus, ["off", "failed"]),
      ),
    )
    .returning({ id: schema.items.id })
    .all();
  rows.forEach((r) => enqueue(r.id));
  return rows.length;
}

// A small in-process queue: one photo at a time keeps memory and CPU in check,
// and keeps auto-tagging requests to one at a time.
// Items stay "pending" in the database, so anything left over is picked up
// again on the next server start (see src/instrumentation.ts).
type Queue = { ids: string[]; running: boolean };
const g = globalThis as unknown as { __bgQueue?: Queue };
const queue: Queue = (g.__bgQueue ??= { ids: [], running: false });

export function enqueue(itemId: string) {
  if (!queue.ids.includes(itemId)) queue.ids.push(itemId);
  void drain();
}

async function drain() {
  if (queue.running) return;
  queue.running = true;
  try {
    while (queue.ids.length) await processItem(queue.ids.shift()!);
  } finally {
    queue.running = false;
  }
}

export function resumePending() {
  const stuck = db
    .select({ id: schema.items.id })
    .from(schema.items)
    .where(or(inArray(schema.items.bgStatus, ["pending", "processing"]), eq(schema.items.tagStatus, "pending")))
    .all();
  stuck.forEach((r) => enqueue(r.id));
  return stuck.length;
}

export function retry(ownerId: string, itemId: string) {
  const res = db
    .update(schema.items)
    .set({ bgStatus: "pending", bgError: null })
    .where(and(eq(schema.items.id, itemId), eq(schema.items.ownerId, ownerId)))
    .run();
  if (res.changes) enqueue(itemId);
}

export function retryTagging(ownerId: string, itemId: string) {
  if (!taggerEnabled()) return;
  const res = db
    .update(schema.items)
    .set({ tagStatus: "pending", tagError: null })
    .where(and(eq(schema.items.id, itemId), eq(schema.items.ownerId, ownerId)))
    .run();
  if (res.changes) enqueue(itemId);
}
