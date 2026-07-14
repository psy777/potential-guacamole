import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  packages,
  packageItems,
  items,
  type Package,
  type Item,
} from "@/lib/db/schema";

export type PackageMemberInput = { itemId: string; quantity: number };
export type PackageInput = {
  name: string;
  description: string;
  active: boolean;
  members: PackageMemberInput[];
};

export type PackageMember = { itemId: string; quantity: number; item: Item };
export type PackageWithMembers = Package & { members: PackageMember[] };

export function listPackages(): PackageWithMembers[] {
  const rows = db.select().from(packages).orderBy(asc(packages.name)).all();
  return rows.map((p) => ({ ...p, members: getPackageMembers(p.id) }));
}

export function getPackageMembers(packageId: string): PackageMember[] {
  const rows = db
    .select({ member: packageItems, item: items })
    .from(packageItems)
    .innerJoin(items, eq(packageItems.itemId, items.id))
    .where(eq(packageItems.packageId, packageId))
    .all();
  return rows.map((r) => ({
    itemId: r.item.id,
    quantity: r.member.quantity,
    item: r.item,
  }));
}

export function getPackage(id: string): PackageWithMembers | undefined {
  const p = db.select().from(packages).where(eq(packages.id, id)).get();
  if (!p) return undefined;
  return { ...p, members: getPackageMembers(id) };
}

/** Total price of a package = sum of member item prices * quantities (cents). */
export function packagePriceCents(pkg: PackageWithMembers): number {
  return pkg.members.reduce(
    (sum, m) => sum + m.item.priceCents * m.quantity,
    0
  );
}

export function createPackage(input: PackageInput): PackageWithMembers {
  return db.transaction((tx) => {
    const pkg = tx
      .insert(packages)
      .values({
        name: input.name,
        description: input.description,
        active: input.active,
      })
      .returning()
      .get();
    for (const m of input.members) {
      tx.insert(packageItems)
        .values({ packageId: pkg.id, itemId: m.itemId, quantity: m.quantity })
        .run();
    }
    return { ...pkg, members: getPackageMembers(pkg.id) };
  });
}

export function updatePackage(
  id: string,
  input: PackageInput
): PackageWithMembers | undefined {
  return db.transaction((tx) => {
    tx.update(packages)
      .set({
        name: input.name,
        description: input.description,
        active: input.active,
        updatedAt: new Date(),
      })
      .where(eq(packages.id, id))
      .run();
    tx.delete(packageItems).where(eq(packageItems.packageId, id)).run();
    for (const m of input.members) {
      tx.insert(packageItems)
        .values({ packageId: id, itemId: m.itemId, quantity: m.quantity })
        .run();
    }
    const p = tx.select().from(packages).where(eq(packages.id, id)).get();
    return p ? { ...p, members: getPackageMembers(id) } : undefined;
  });
}

export function deletePackage(id: string): void {
  db.delete(packages).where(eq(packages.id, id)).run();
}
