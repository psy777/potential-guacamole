import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { optionSets } from "@/lib/db/schema";

// A reusable, named list of option values (e.g. "Construction" ->
// [Standard, Rugged, Specialty]) used to generate item variations. Saved once
// in the Studio and offered on every item so nothing is retyped.
export type OptionSetView = { id: string; name: string; values: string[] };

function parseValues(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export async function listOptionSets(): Promise<OptionSetView[]> {
  const rows = await db.select().from(optionSets).orderBy(asc(optionSets.name));
  return rows.map((r) => ({ id: r.id, name: r.name, values: parseValues(r.values) }));
}

/** Create or replace a set by name (so re-saving "Construction" updates it). */
export async function saveOptionSet(name: string, values: string[]): Promise<OptionSetView> {
  const cleanName = name.trim() || "Options";
  const cleanValues = values.map((v) => v.trim()).filter(Boolean);
  const existing = (
    await db.select().from(optionSets).where(eq(optionSets.name, cleanName)).limit(1)
  )[0];

  if (existing) {
    await db
      .update(optionSets)
      .set({ values: JSON.stringify(cleanValues), updatedAt: new Date() })
      .where(eq(optionSets.id, existing.id));
    return { id: existing.id, name: cleanName, values: cleanValues };
  }
  const row = (
    await db
      .insert(optionSets)
      .values({ name: cleanName, values: JSON.stringify(cleanValues) })
      .returning()
  )[0];
  return { id: row.id, name: cleanName, values: cleanValues };
}

export async function deleteOptionSet(id: string): Promise<void> {
  await db.delete(optionSets).where(eq(optionSets.id, id));
}
