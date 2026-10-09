import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "@/db";

// Local-disk storage. Swap for S3/R2 behind the same functions when deploying.
export type Variant = "original" | "cutout" | "thumb";

const FILES: Record<Variant, { file: string; type: string }> = {
  original: { file: "original.jpg", type: "image/jpeg" },
  cutout: { file: "cutout.png", type: "image/png" },
  thumb: { file: "thumb.webp", type: "image/webp" },
};

const UPLOADS = path.join(DATA_DIR, "uploads");

function filePath(ownerId: string, itemId: string, variant: Variant) {
  // ids are UUIDs we generated, but guard against path tricks anyway.
  if (!/^[\w-]+$/.test(ownerId) || !/^[\w-]+$/.test(itemId)) throw new Error("bad id");
  return path.join(UPLOADS, ownerId, itemId, FILES[variant].file);
}

export async function writeImage(ownerId: string, itemId: string, variant: Variant, data: Buffer) {
  const p = filePath(ownerId, itemId, variant);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, data);
}

export async function readImage(ownerId: string, itemId: string, variant: Variant) {
  try {
    return { data: await fs.readFile(filePath(ownerId, itemId, variant)), type: FILES[variant].type };
  } catch {
    return null;
  }
}

export async function deleteItemImages(ownerId: string, itemId: string) {
  await fs.rm(path.dirname(filePath(ownerId, itemId, "original")), { recursive: true, force: true });
}
