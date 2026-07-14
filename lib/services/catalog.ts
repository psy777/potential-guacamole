import { listItems } from "@/lib/services/items";
import { listPackages, packagePriceCents } from "@/lib/services/packages";

export type CatalogOption = {
  kind: "item" | "package";
  id: string;
  name: string;
  priceCents: number;
};

/** Combined, order-form-ready list of active items and packages. */
export function catalogOptions(): CatalogOption[] {
  const items = listItems()
    .filter((i) => i.active)
    .map((i) => ({
      kind: "item" as const,
      id: i.id,
      name: i.name,
      priceCents: i.priceCents,
    }));
  const pkgs = listPackages()
    .filter((p) => p.active)
    .map((p) => ({
      kind: "package" as const,
      id: p.id,
      name: p.name,
      priceCents: packagePriceCents(p),
    }));
  return [...items, ...pkgs];
}
