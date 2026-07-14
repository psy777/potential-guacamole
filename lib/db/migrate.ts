import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";

/** Apply any pending SQL migrations from the ./drizzle folder. Safe to re-run. */
export function runMigrations(): void {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  if (!fs.existsSync(migrationsFolder)) {
    console.warn(
      "[db] no ./drizzle migrations found — run `npm run db:generate` first."
    );
    return;
  }
  migrate(db, { migrationsFolder });
  console.log("[db] migrations applied");
}
