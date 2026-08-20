import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { DATABASE_URL } from "@/lib/config";

// Reuse a single connection pool across hot-reloads.
const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

// `prepare: false` is required for Neon's pooled (PgBouncer transaction-mode)
// connection string. postgres() is lazy — it doesn't connect until first query.
// `idle_timeout` is critical on an always-on host (Render): without it, idle
// connections stay open forever and Neon's compute never autosuspends, burning
// compute-hours 24/7. Closing idle conns lets Neon scale to zero between requests.
const client =
  globalForDb.__pgClient ??
  postgres(DATABASE_URL, {
    prepare: false,
    idle_timeout: 20, // seconds an idle connection is kept before closing
    max: 5, // cap the pool; a small app doesn't need 10
  });
if (process.env.NODE_ENV !== "production") globalForDb.__pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
