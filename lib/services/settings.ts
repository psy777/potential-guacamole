import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings, type Settings } from "@/lib/db/schema";

export function getSettings(): Settings {
  let row = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (!row) {
    db.insert(settings).values({ id: 1 }).run();
    row = db.select().from(settings).where(eq(settings.id, 1)).get()!;
  }
  return row;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  getSettings(); // ensure the row exists
  db.update(settings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(settings.id, 1))
    .run();
  return getSettings();
}
