import { listItems } from "@/lib/services/items";
import { listPackages, packagePriceCents } from "@/lib/services/packages";

export type CatalogOption = {
  // Unique per option (an item can appear once per variation) — use for keys.
  value: string;
  kind: "item" | "package";
  id: string; // the item or package id
  variationId?: string;
  name: string;
  priceCents: number;
};

/**
 * Combined, order-form-ready list. Each item variation becomes its own
 * sellable option (e.g. "T-Shirt — Large"), so picking from the catalog gives
 * the right price. Packages are listed too.
 */
export function catalogOptions(): CatalogOption[] {
  const itemOptions: CatalogOption[] = [];
  for (const item of listItems().filter((i) => i.active)) {
    const variations = item.variations.filter((v) => v.active);
    if (variations.length === 0) {
      itemOptions.push({
        value: `item:${item.id}`,
        kind: "item",
        id: item.id,
        name: item.name,
        priceCents: item.priceCents,
      });
      continue;
    }
    for (const v of variations) {
      itemOptions.push({
        value: `item:${item.id}:${v.id}`,
        kind: "item",
        id: item.id,
        variationId: v.id,
        name: variations.length > 1 ? `${item.name} — ${v.name}` : item.name,
        priceCents: v.priceCents,
      });
    }
  }

  const pkgOptions: CatalogOption[] = listPackages()
    .filter((p) => p.active)
    .map((p) => ({
      value: `package:${p.id}`,
      kind: "package" as const,
      id: p.id,
      name: p.name,
      priceCents: packagePriceCents(p),
    }));

  return [...itemOptions, ...pkgOptions];
}
