import { listItems } from "@/lib/services/items";
import { listPackages, packagePriceCents } from "@/lib/services/packages";

/** One selectable thing (a specific variation, a no-variation item, or a package). */
export type CatalogPick = {
  value: string; // unique — used as the line's catalog key
  kind: "item" | "package";
  id: string; // item or package id
  variationId?: string;
  itemName: string;
  variationName: string; // "" when the item has no variations / is a package
  priceCents: number;
};

/** An item (or package) grouped with its variations, for the order picker. */
export type CatalogGroup = {
  key: string;
  kind: "item" | "package";
  id: string;
  name: string;
  picks: CatalogPick[];
};

export async function catalogGroups(): Promise<CatalogGroup[]> {
  const [allItems, allPackages] = await Promise.all([listItems(), listPackages()]);
  const itemGroups: CatalogGroup[] = allItems
    .filter((i) => i.active)
    .map((item) => {
      const variations = item.variations.filter((v) => v.active);
      const picks: CatalogPick[] =
        variations.length === 0
          ? [
              {
                value: `item:${item.id}`,
                kind: "item",
                id: item.id,
                itemName: item.name,
                variationName: "",
                priceCents: item.priceCents,
              },
            ]
          : variations.map((v) => ({
              value: `item:${item.id}:${v.id}`,
              kind: "item",
              id: item.id,
              variationId: v.id,
              itemName: item.name,
              variationName: v.name,
              priceCents: v.priceCents,
            }));
      return { key: `item:${item.id}`, kind: "item", id: item.id, name: item.name, picks };
    });

  const pkgGroups: CatalogGroup[] = allPackages
    .filter((p) => p.active)
    .map((p) => ({
      key: `package:${p.id}`,
      kind: "package",
      id: p.id,
      name: p.name,
      picks: [
        {
          value: `package:${p.id}`,
          kind: "package",
          id: p.id,
          itemName: p.name,
          variationName: "",
          priceCents: packagePriceCents(p),
        },
      ],
    }));

  return [...itemGroups, ...pkgGroups];
}
