import { asc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  items,
  itemVariations,
  type Item,
  type ItemVariation,
} from "@/lib/db/schema";

export type ItemVariationInput = {
  name: string;
  sku: string;
  gtin: string;
  priceCents: number;
  imagePath: string;
};

export type ItemInput = {
  name: string;
  description: string;
  category: string;
  currency: string;
  active: boolean;
  imagePath: string;
  variations: ItemVariationInput[];
};

export type ItemWithVariations = Item & { variations: ItemVariation[] };

/** Lowest variation price (what the list shows as "starting at"). */
export function startingPriceCents(item: ItemWithVariations): number {
  if (item.variations.length === 0) return item.priceCents;
  return Math.min(...item.variations.map((v) => v.priceCents));
}

function withVariations(item: Item): ItemWithVariations {
  const variations = db
    .select()
    .from(itemVariations)
    .where(eq(itemVariations.itemId, item.id))
    .orderBy(asc(itemVariations.position))
    .all();
  return { ...item, variations };
}

export function listItems(search?: string): ItemWithVariations[] {
  const q = db.select().from(items);
  const rows =
    search && search.trim()
      ? q
          .where(
            or(
              like(items.name, `%${search.trim()}%`),
              like(items.sku, `%${search.trim()}%`),
              like(items.category, `%${search.trim()}%`)
            )
          )
          .orderBy(asc(items.name))
          .all()
      : q.orderBy(asc(items.name)).all();
  return rows.map(withVariations);
}

/** Distinct, non-empty category names (for the category picker). */
export function listCategories(): string[] {
  return db
    .selectDistinct({ category: items.category })
    .from(items)
    .where(sql`${items.category} <> ''`)
    .orderBy(asc(items.category))
    .all()
    .map((r) => r.category);
}

export function getItem(id: string): ItemWithVariations | undefined {
  const item = db.select().from(items).where(eq(items.id, id)).get();
  return item ? withVariations(item) : undefined;
}

function normalizeVariations(input: ItemVariationInput[]): ItemVariationInput[] {
  const cleaned = input
    .map((v) => ({ ...v, name: v.name.trim() }))
    .filter((v) => v.name || v.priceCents > 0 || v.sku || v.gtin);
  if (cleaned.length === 0) {
    cleaned.push({ name: "Regular", sku: "", gtin: "", priceCents: 0, imagePath: "" });
  }
  return cleaned.map((v) => ({ ...v, name: v.name || "Regular" }));
}

export function createItem(input: ItemInput): ItemWithVariations {
  const variations = normalizeVariations(input.variations);
  const base = variations[0];
  return db.transaction((tx) => {
    const item = tx
      .insert(items)
      .values({
        name: input.name,
        description: input.description,
        category: input.category,
        currency: input.currency,
        active: input.active,
        imagePath: input.imagePath,
        sku: base.sku,
        priceCents: base.priceCents,
      })
      .returning()
      .get();
    variations.forEach((v, i) => {
      tx.insert(itemVariations)
        .values({
          itemId: item.id,
          name: v.name,
          sku: v.sku,
          gtin: v.gtin,
          priceCents: v.priceCents,
          imagePath: v.imagePath,
          position: i,
        })
        .run();
    });
    return withVariations(item);
  });
}

export function updateItem(
  id: string,
  input: ItemInput
): ItemWithVariations | undefined {
  const variations = normalizeVariations(input.variations);
  const base = variations[0];
  return db.transaction((tx) => {
    tx.update(items)
      .set({
        name: input.name,
        description: input.description,
        category: input.category,
        currency: input.currency,
        active: input.active,
        imagePath: input.imagePath,
        sku: base.sku,
        priceCents: base.priceCents,
        updatedAt: new Date(),
      })
      .where(eq(items.id, id))
      .run();
    tx.delete(itemVariations).where(eq(itemVariations.itemId, id)).run();
    variations.forEach((v, i) => {
      tx.insert(itemVariations)
        .values({
          itemId: id,
          name: v.name,
          sku: v.sku,
          gtin: v.gtin,
          priceCents: v.priceCents,
          imagePath: v.imagePath,
          position: i,
        })
        .run();
    });
    const item = tx.select().from(items).where(eq(items.id, id)).get();
    return item ? withVariations(item) : undefined;
  });
}

export function deleteItem(id: string): void {
  db.delete(items).where(eq(items.id, id)).run();
}
