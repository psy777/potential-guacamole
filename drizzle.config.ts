import type { Config } from "drizzle-kit";
import { DB_PATH } from "./lib/config";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: DB_PATH,
  },
} satisfies Config;
