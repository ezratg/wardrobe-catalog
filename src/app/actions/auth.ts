"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";

export type AuthState = { error?: string; fields?: { name?: string; email?: string } } | undefined;

const SignupSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(80),
  email: z.string().trim().toLowerCase().email("That email doesn't look right"),
  password: z.string().min(8, "Use at least 8 characters for your password").max(200),
});

export async function signup(_prev: AuthState, form: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(form);
  const parsed = SignupSchema.safeParse(raw);
  const fields = { name: String(raw.name ?? ""), email: String(raw.email ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const { name, email, password } = parsed.data;
  const exists = db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).get();
  if (exists) return { error: "There's already an account with that email. Try logging in.", fields };

  const user = db
    .insert(schema.users)
    .values({ name, email, passwordHash: await hashPassword(password) })
    .returning({ id: schema.users.id })
    .get();
  await createSession(user.id);
  redirect("/");
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email or password is incorrect.", fields: { email } };
  }
  await createSession(user.id);
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
