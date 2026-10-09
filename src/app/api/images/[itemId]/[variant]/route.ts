import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { canViewCloset, getCurrentUser } from "@/lib/auth/dal";
import { readImage, type Variant } from "@/lib/images/storage";

const VARIANTS: Variant[] = ["original", "cutout", "thumb"];

export async function GET(_req: Request, ctx: RouteContext<"/api/images/[itemId]/[variant]">) {
  const { itemId, variant } = await ctx.params;
  if (!VARIANTS.includes(variant as Variant)) return new Response("Not found", { status: 404 });

  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  const item = db
    .select({ ownerId: schema.items.ownerId })
    .from(schema.items)
    .where(eq(schema.items.id, itemId))
    .get();
  if (!item || !canViewCloset(user.id, item.ownerId)) return new Response("Not found", { status: 404 });

  const img = await readImage(item.ownerId, itemId, variant as Variant);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.type,
      // URLs carry ?v=<imageVersion>, so a changed image gets a new URL.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
