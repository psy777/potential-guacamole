import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/lib/db";

/** Apply any pending SQL migrations from the ./drizzle folder. Safe to re-run. */
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[db] migrations applied");
}
