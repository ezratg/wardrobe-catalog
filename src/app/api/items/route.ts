import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { enqueue, storeOriginal } from "@/lib/images/pipeline";
import { taggerEnabled } from "@/lib/images/tagger";
import { CATEGORIES } from "@/lib/taxonomy";

const MAX_BYTES = 25 * 1024 * 1024;

// Upload one photo; creates an item and queues background removal.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No photo attached" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Photo is over 25 MB" }, { status: 413 });

  const category = String(form.get("category") ?? "");
  const item = db
    .insert(schema.items)
    .values({
      ownerId: user.id,
      category: CATEGORIES.some((c) => c.id === category) ? category : "uncategorized",
      tagStatus: taggerEnabled() ? "pending" : "off",
    })
    .returning()
    .get();

  try {
    await storeOriginal(user.id, item.id, Buffer.from(await file.arrayBuffer()));
  } catch {
    db.delete(schema.items).where(eq(schema.items.id, item.id)).run();
    return NextResponse.json(
      { error: "That file couldn't be read as a photo. Try a JPEG or PNG." },
      { status: 415 },
    );
  }
  enqueue(item.id);
  return NextResponse.json({ id: item.id }, { status: 201 });
}
