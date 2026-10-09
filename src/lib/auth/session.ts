import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const COOKIE = "wc_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_WHEN_LEFT_MS = 15 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS);
  db.insert(schema.sessions).values({ id: hashToken(token), userId, expiresAt }).run();
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Returns the signed-in user's id, or null. Reads the request cookie. */
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  await connection(); // session checks use the current time, so never prerender past this point
  const id = hashToken(token);
  const session = db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).get();
  if (!session) return null;
  const left = session.expiresAt.getTime() - Date.now();
  if (left <= 0) {
    db.delete(schema.sessions).where(eq(schema.sessions.id, id)).run();
    return null;
  }
  if (left < REFRESH_WHEN_LEFT_MS) {
    // Sliding expiry; the cookie itself is refreshed on the next login.
    db.update(schema.sessions)
      .set({ expiresAt: new Date(Date.now() + TTL_MS) })
      .where(eq(schema.sessions.id, id))
      .run();
  }
  return session.userId;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token))).run();
  jar.delete(COOKIE);
}
