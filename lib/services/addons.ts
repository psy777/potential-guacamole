import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { addOns, itemAddOns } from "@/lib/db/schema";

// A priced extra a customer can add to an item to make it cost more. Saved once
// in the library and offered on any item.
export type AddOnView = { id: string; name: string; priceCents: number };

export async function listAddOns(): Promise<AddOnView[]> {
  const rows = await db.select().from(addOns).orderBy(asc(addOns.name));
  return rows.map((r) => ({ id: r.id, name: r.name, priceCents: r.priceCents }));
}

export async function createAddOn(name: string, priceCents: number): Promise<AddOnView> {
  const row = (
    await db
      .insert(addOns)
      .values({ name: name.trim() || "Add-on", priceCents: Math.max(0, Math.round(priceCents)) })
      .returning()
  )[0];
  return { id: row.id, name: row.name, priceCents: row.priceCents };
}

export async function deleteAddOn(id: string): Promise<void> {
  await db.delete(addOns).where(eq(addOns.id, id));
}

/** Look up add-ons by id (preserving the given order), for pricing/snapshots. */
export async function addOnsByIds(ids: string[]): Promise<AddOnView[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const rows = await db.select().from(addOns).where(inArray(addOns.id, unique));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return unique
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({ id: r.id, name: r.name, priceCents: r.priceCents }));
}

/** The add-on ids currently attached to an item. */
export async function itemAddOnIds(itemId: string): Promise<string[]> {
  const rows = await db
    .select({ addOnId: itemAddOns.addOnId })
    .from(itemAddOns)
    .where(eq(itemAddOns.itemId, itemId));
  return rows.map((r) => r.addOnId);
}

/** Every item's add-ons keyed by item id (for the Studio order form). */
export async function allItemAddOns(): Promise<Record<string, AddOnView[]>> {
  const rows = await db
    .select({ itemId: itemAddOns.itemId, a: addOns })
    .from(itemAddOns)
    .innerJoin(addOns, eq(itemAddOns.addOnId, addOns.id))
    .orderBy(asc(addOns.name));
  const map: Record<string, AddOnView[]> = {};
  for (const r of rows) {
    (map[r.itemId] ??= []).push({ id: r.a.id, name: r.a.name, priceCents: r.a.priceCents });
  }
  return map;
}

/** The add-ons (with price) attached to an item, for display/ordering. */
export async function itemAddOns_(itemId: string): Promise<AddOnView[]> {
  const rows = await db
    .select({ a: addOns })
    .from(itemAddOns)
    .innerJoin(addOns, eq(itemAddOns.addOnId, addOns.id))
    .where(eq(itemAddOns.itemId, itemId))
    .orderBy(asc(addOns.name));
  return rows.map((r) => ({ id: r.a.id, name: r.a.name, priceCents: r.a.priceCents }));
}
