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
const client =
  globalForDb.__pgClient ?? postgres(DATABASE_URL, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.__pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
