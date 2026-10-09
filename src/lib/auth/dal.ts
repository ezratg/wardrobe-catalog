import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUserId } from "./session";

export type CurrentUser = { id: string; name: string; email: string };

/** The signed-in user, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();
  return user ?? null;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Whether `viewerId` may see `ownerId`'s closet. Only the owner for now; when
 * friend sharing lands this also accepts members with an accepted closet_shares row.
 */
export function canViewCloset(viewerId: string, ownerId: string) {
  return viewerId === ownerId;
}
