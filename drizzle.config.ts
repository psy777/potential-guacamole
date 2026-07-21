import type { Config } from "drizzle-kit";
import { DATABASE_URL } from "./lib/config";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
} satisfies Config;
