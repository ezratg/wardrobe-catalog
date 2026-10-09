import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? "data");

type DB = BetterSQLite3Database<typeof schema>;

function open(): DB {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(path.join(DATA_DIR, "wardrobe.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(/*turbopackIgnore: true*/ "drizzle") });
  return db;
}

// Opened lazily on first query (so `next build` never touches the database),
// and reused across hot reloads in dev.
const g = globalThis as unknown as { __wardrobeDb?: DB };
const real = () => (g.__wardrobeDb ??= open());
export const db = new Proxy({} as DB, {
  get(_t, key) {
    const v = Reflect.get(real(), key);
    return typeof v === "function" ? v.bind(real()) : v;
  },
});
export { schema };
