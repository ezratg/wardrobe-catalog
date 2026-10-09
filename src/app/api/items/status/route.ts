import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth/dal";

// Background-removal status for a set of the caller's items (used for polling).
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 200);
  if (!ids.length) return NextResponse.json({ items: [] });
  const rows = db
    .select({ id: schema.items.id, bgStatus: schema.items.bgStatus, imageVersion: schema.items.imageVersion })
    .from(schema.items)
    .where(and(eq(schema.items.ownerId, user.id), inArray(schema.items.id, ids)))
    .all();
  return NextResponse.json({ items: rows });
}
