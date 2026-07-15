import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { items, itemVariations } from "@/lib/db/schema";
import { square as squareConfig } from "@/lib/config";

const SQUARE_VERSION = "2025-01-23";

// --- Types (only the bits of Square's catalog we use) --------------------

type SquareMoney = { amount?: number; currency?: string };
type SquareVariationObj = {
  id: string;
  is_deleted?: boolean;
  item_variation_data?: {
    name?: string;
    sku?: string;
    upc?: string;
    price_money?: SquareMoney;
  };
};
type SquareItemObj = {
  id: string;
  is_deleted?: boolean;
  item_data?: {
    name?: string;
    description?: string;
    category_id?: string;
    categories?: { id?: string }[];
    variations?: SquareVariationObj[];
  };
};
type SquareCategoryObj = {
  id: string;
  category_data?: { name?: string };
};

export type MappedVariation = {
  name: string;
  sku: string;
  gtin: string;
  priceCents: number;
  squareVariationId: string;
};
export type MappedItem = {
  squareCatalogId: string;
  name: string;
  description: string;
  category: string;
  currency: string;
  variations: MappedVariation[];
};

// --- Pure mapping (Square object -> FireCoast shape) ---------------------

export function mapSquareItem(
  obj: SquareItemObj,
  categoryNames: Map<string, string>
): MappedItem {
  const d = obj.item_data ?? {};
  const catId = d.category_id ?? d.categories?.[0]?.id;
  const variations: MappedVariation[] = (d.variations ?? [])
    .filter((v) => !v.is_deleted)
    .map((v) => {
      const vd = v.item_variation_data ?? {};
      return {
        name: vd.name || "Regular",
        sku: vd.sku || "",
        gtin: vd.upc || "",
        priceCents: Number(vd.price_money?.amount ?? 0),
        squareVariationId: v.id,
      };
    });
  const firstCurrency =
    (d.variations ?? [])[0]?.item_variation_data?.price_money?.currency || "USD";
  return {
    squareCatalogId: obj.id,
    name: d.name || "Unnamed item",
    description: d.description || "",
    category: catId ? categoryNames.get(catId) ?? "" : "",
    currency: firstCurrency,
    variations,
  };
}

// --- DB upsert (keyed by Square IDs, so re-imports update in place) -------

export function upsertMappedItems(mapped: MappedItem[]): {
  created: number;
  updated: number;
} {
  let created = 0;
  let updated = 0;

  for (const m of mapped) {
    const variations =
      m.variations.length > 0
        ? m.variations
        : [{ name: "Regular", sku: "", gtin: "", priceCents: 0, squareVariationId: `${m.squareCatalogId}-default` }];
    const base = variations[0];

    const existing = db
      .select()
      .from(items)
      .where(eq(items.squareCatalogId, m.squareCatalogId))
      .get();

    db.transaction((tx) => {
      let itemId: string;
      if (existing) {
        tx.update(items)
          .set({
            name: m.name,
            description: m.description,
            category: m.category,
            currency: m.currency,
            sku: base.sku,
            priceCents: base.priceCents,
            updatedAt: new Date(),
          })
          .where(eq(items.id, existing.id))
          .run();
        tx.delete(itemVariations).where(eq(itemVariations.itemId, existing.id)).run();
        itemId = existing.id;
        updated += 1;
      } else {
        const row = tx
          .insert(items)
          .values({
            name: m.name,
            description: m.description,
            category: m.category,
            currency: m.currency,
            active: true,
            sku: base.sku,
            priceCents: base.priceCents,
            squareCatalogId: m.squareCatalogId,
          })
          .returning()
          .get();
        itemId = row.id;
        created += 1;
      }

      variations.forEach((v, i) => {
        tx.insert(itemVariations)
          .values({
            itemId,
            name: v.name,
            sku: v.sku,
            gtin: v.gtin,
            priceCents: v.priceCents,
            position: i,
            squareVariationId: v.squareVariationId,
          })
          .run();
      });
    });
  }

  return { created, updated };
}

// --- Fetch from Square (outbound; works from the local app) ---------------

async function fetchCatalogObjects(): Promise<{
  itemObjs: SquareItemObj[];
  categoryNames: Map<string, string>;
}> {
  const itemObjs: SquareItemObj[] = [];
  const categoryNames = new Map<string, string>();
  let cursor: string | undefined;

  do {
    const url = new URL(`${squareConfig.apiBase}/v2/catalog/list`);
    url.searchParams.set("types", "ITEM,CATEGORY");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${squareConfig.accessToken}`,
        "Square-Version": SQUARE_VERSION,
        "Content-Type": "application/json",
      },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(JSON.stringify(json.errors ?? json));
    }
    for (const obj of json.objects ?? []) {
      if (obj.type === "ITEM" && !obj.is_deleted) itemObjs.push(obj);
      else if (obj.type === "CATEGORY") {
        const c = obj as SquareCategoryObj;
        if (c.category_data?.name) categoryNames.set(c.id, c.category_data.name);
      }
    }
    cursor = json.cursor;
  } while (cursor);

  return { itemObjs, categoryNames };
}

/** Pull the whole Square catalog and upsert it into FireCoast. */
export async function importSquareCatalog(): Promise<{
  created: number;
  updated: number;
}> {
  if (!squareConfig.isConfigured) {
    throw new Error("Square is not configured (set SQUARE_ACCESS_TOKEN).");
  }
  const { itemObjs, categoryNames } = await fetchCatalogObjects();
  const mapped = itemObjs.map((o) => mapSquareItem(o, categoryNames));
  return upsertMappedItems(mapped);
}
