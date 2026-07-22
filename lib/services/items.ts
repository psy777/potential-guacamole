import { asc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  items,
  itemVariations,
  itemAddOns,
  type Item,
  type ItemVariation,
} from "@/lib/db/schema";
import { itemAddOnIds } from "@/lib/services/addons";

export type ItemVariationInput = {
  name: string;
  sku: string;
  gtin: string;
  priceCents: number;
  wholesalePriceCents: number | null;
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
  addOnIds: string[];
};

export type ItemWithVariations = Item & {
  variations: ItemVariation[];
  addOnIds?: string[]; // populated by getItem (for the editor); omitted in lists
};

/** Lowest variation price (what the list shows as "starting at"). */
export function startingPriceCents(item: ItemWithVariations): number {
  if (item.variations.length === 0) return item.priceCents;
  return Math.min(...item.variations.map((v) => v.priceCents));
}

async function withVariations(item: Item): Promise<ItemWithVariations> {
  const variations = await db
    .select()
    .from(itemVariations)
    .where(eq(itemVariations.itemId, item.id))
    .orderBy(asc(itemVariations.position));
  return { ...item, variations };
}

export async function listItems(search?: string): Promise<ItemWithVariations[]> {
  const rows =
    search && search.trim()
      ? await db
          .select()
          .from(items)
          .where(
            or(
              like(items.name, `%${search.trim()}%`),
              like(items.sku, `%${search.trim()}%`),
              like(items.category, `%${search.trim()}%`)
            )
          )
          .orderBy(asc(items.name))
      : await db.select().from(items).orderBy(asc(items.name));
  return Promise.all(rows.map(withVariations));
}

/** Distinct, non-empty category names (for the category picker). */
export async function listCategories(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: items.category })
    .from(items)
    .where(sql`${items.category} <> ''`)
    .orderBy(asc(items.category));
  return rows.map((r) => r.category);
}

export async function getItem(id: string): Promise<ItemWithVariations | undefined> {
  const item = (await db.select().from(items).where(eq(items.id, id)).limit(1))[0];
  if (!item) return undefined;
  const [withVars, addOnIds] = await Promise.all([withVariations(item), itemAddOnIds(id)]);
  return { ...withVars, addOnIds };
}

/** Replace an item's attached add-ons (call inside the create/update tx). */
async function writeItemAddOns(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  itemId: string,
  addOnIds: string[]
): Promise<void> {
  await tx.delete(itemAddOns).where(eq(itemAddOns.itemId, itemId));
  const unique = [...new Set(addOnIds.filter(Boolean))];
  for (const addOnId of unique) {
    await tx.insert(itemAddOns).values({ itemId, addOnId });
  }
}

function normalizeVariations(input: ItemVariationInput[]): ItemVariationInput[] {
  const cleaned = input
    .map((v) => ({ ...v, name: v.name.trim() }))
    .filter((v) => v.name || v.priceCents > 0 || v.sku || v.gtin);
  if (cleaned.length === 0) {
    cleaned.push({
      name: "Regular",
      sku: "",
      gtin: "",
      priceCents: 0,
      wholesalePriceCents: null,
      imagePath: "",
    });
  }
  return cleaned.map((v) => ({ ...v, name: v.name || "Regular" }));
}

export async function createItem(input: ItemInput): Promise<ItemWithVariations> {
  const variations = normalizeVariations(input.variations);
  const base = variations[0];
  return db.transaction(async (tx) => {
    const item = (
      await tx
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
    )[0];
    const created: ItemVariation[] = [];
    for (let i = 0; i < variations.length; i++) {
      const v = variations[i];
      created.push(
        (
          await tx
            .insert(itemVariations)
            .values({
              itemId: item.id,
              name: v.name,
              sku: v.sku,
              gtin: v.gtin,
              priceCents: v.priceCents,
              wholesalePriceCents: v.wholesalePriceCents,
              imagePath: v.imagePath,
              position: i,
            })
            .returning()
        )[0]
      );
    }
    await writeItemAddOns(tx, item.id, input.addOnIds);
    return { ...item, variations: created, addOnIds: input.addOnIds };
  });
}

export async function updateItem(
  id: string,
  input: ItemInput
): Promise<ItemWithVariations | undefined> {
  const variations = normalizeVariations(input.variations);
  const base = variations[0];
  return db.transaction(async (tx) => {
    await tx
      .update(items)
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
      .where(eq(items.id, id));
    await tx.delete(itemVariations).where(eq(itemVariations.itemId, id));
    const created: ItemVariation[] = [];
    for (let i = 0; i < variations.length; i++) {
      const v = variations[i];
      created.push(
        (
          await tx
            .insert(itemVariations)
            .values({
              itemId: id,
              name: v.name,
              sku: v.sku,
              gtin: v.gtin,
              priceCents: v.priceCents,
              wholesalePriceCents: v.wholesalePriceCents,
              imagePath: v.imagePath,
              position: i,
            })
            .returning()
        )[0]
      );
    }
    await writeItemAddOns(tx, id, input.addOnIds);
    const item = (await tx.select().from(items).where(eq(items.id, id)).limit(1))[0];
    return item ? { ...item, variations: created, addOnIds: input.addOnIds } : undefined;
  });
}

export async function deleteItem(id: string): Promise<void> {
  await db.delete(items).where(eq(items.id, id));
}
