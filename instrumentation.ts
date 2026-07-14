// Next.js runs this once when the server process boots. The node-only imports
// live INSIDE the `=== "nodejs"` block so they are dead-code-eliminated from the
// Edge bundle (the middleware runs on Edge and must not pull in better-sqlite3).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("@/lib/db/migrate");
    runMigrations();

    const { startPoller } = await import("@/lib/services/poller");
    startPoller();
  }
}
