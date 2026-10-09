import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

// Session tokens are stored hashed; the raw token only lives in the cookie.
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export type BgStatus = "pending" | "processing" | "done" | "failed";

export const items = sqliteTable(
  "items",
  {
    id: id(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    category: text("category").notNull().default("uncategorized"),
    subcategory: text("subcategory"),
    colors: text("colors", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    // True once the user has edited colours, so auto-detection stops overwriting them.
    colorsConfirmed: integer("colors_confirmed", { mode: "boolean" }).notNull().default(false),
    pattern: text("pattern"),
    styles: text("styles", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    warmth: text("warmth", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    formality: text("formality"),
    brand: text("brand"),
    size: text("size"),
    notes: text("notes"),
    laundry: text("laundry").notNull().default("clean"),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    wearCount: integer("wear_count").notNull().default(0),
    lastWornAt: integer("last_worn_at", { mode: "timestamp_ms" }),

    // Images live in storage under data/uploads/<owner>/<item>/; these flag which exist.
    hasCutout: integer("has_cutout", { mode: "boolean" }).notNull().default(false),
    bgStatus: text("bg_status").$type<BgStatus>().notNull().default("pending"),
    bgError: text("bg_error"),
    imageVersion: integer("image_version").notNull().default(1),

    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdateFn(() => new Date()),
  },
  (t) => [index("items_owner_idx").on(t.ownerId, t.createdAt), index("items_bg_idx").on(t.bgStatus)],
);

// Saved outfits. Used by the outfit builder, chat suggestions, and friends' picks.
export const outfits = sqliteTable(
  "outfits",
  {
    id: id(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // Who put it together: the owner, a friend with stylist access, or Claude.
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    source: text("source").$type<"manual" | "chat" | "friend">().notNull().default("manual"),
    name: text("name").notNull().default(""),
    occasion: text("occasion"),
    notes: text("notes"),
    // Snapshot of the weather / calendar context the outfit was picked for.
    context: text("context", { mode: "json" }).$type<Record<string, unknown>>(),
    plannedFor: text("planned_for"), // YYYY-MM-DD
    wornAt: integer("worn_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("outfits_owner_idx").on(t.ownerId, t.createdAt)],
);

export const outfitItems = sqliteTable(
  "outfit_items",
  {
    outfitId: text("outfit_id").notNull().references(() => outfits.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.outfitId, t.itemId] })],
);

// Sharing a closet with friends. An invite starts with an email + token and is
// tied to a member account once accepted. "viewer" can browse; "stylist" can
// also propose outfits.
export const closetShares = sqliteTable(
  "closet_shares",
  {
    id: id(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    memberId: text("member_id").references(() => users.id, { onDelete: "cascade" }),
    inviteEmail: text("invite_email"),
    inviteToken: text("invite_token").unique(),
    role: text("role").$type<"viewer" | "stylist">().notNull().default("stylist"),
    createdAt: createdAt(),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
  },
  (t) => [uniqueIndex("closet_shares_owner_member").on(t.ownerId, t.memberId)],
);

export type User = typeof users.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Outfit = typeof outfits.$inferSelect;
