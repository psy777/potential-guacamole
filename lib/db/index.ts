import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import * as schema from "./schema";
import { DB_PATH, DATA_DIR } from "@/lib/config";

type DB = BetterSQLite3Database<typeof schema>;

// Reuse a single connection across hot-reloads / imports.
const globalForDb = globalThis as unknown as {
  __db?: DB;
  __sqlite?: Database.Database;
};

// The connection is opened LAZILY on first use. This matters at build time:
// simply importing a route module must not open (and create) the database.
function init(): DB {
  if (globalForDb.__db) return globalForDb.__db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  globalForDb.__sqlite = sqlite;
  globalForDb.__db = drizzle(sqlite, { schema });
  return globalForDb.__db;
}

export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = init();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
