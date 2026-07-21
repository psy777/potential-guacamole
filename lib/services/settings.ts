import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings, type Settings } from "@/lib/db/schema";

export async function getSettings(): Promise<Settings> {
  let row = (await db.select().from(settings).where(eq(settings.id, 1)).limit(1))[0];
  if (!row) {
    await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
    row = (await db.select().from(settings).where(eq(settings.id, 1)).limit(1))[0]!;
  }
  return row;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  await getSettings(); // ensure the row exists
  await db
    .update(settings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(settings.id, 1));
  return getSettings();
}
