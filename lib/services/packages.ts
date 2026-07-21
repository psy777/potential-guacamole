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

export async function getPackageMembers(packageId: string): Promise<PackageMember[]> {
  const rows = await db
    .select({ member: packageItems, item: items })
    .from(packageItems)
    .innerJoin(items, eq(packageItems.itemId, items.id))
    .where(eq(packageItems.packageId, packageId));
  return rows.map((r) => ({
    itemId: r.item.id,
    quantity: r.member.quantity,
    item: r.item,
  }));
}

export async function listPackages(): Promise<PackageWithMembers[]> {
  const rows = await db.select().from(packages).orderBy(asc(packages.name));
  return Promise.all(
    rows.map(async (p) => ({ ...p, members: await getPackageMembers(p.id) }))
  );
}

export async function getPackage(id: string): Promise<PackageWithMembers | undefined> {
  const p = (await db.select().from(packages).where(eq(packages.id, id)).limit(1))[0];
  if (!p) return undefined;
  return { ...p, members: await getPackageMembers(id) };
}

/** Total price of a package = sum of member item prices * quantities (cents). */
export function packagePriceCents(pkg: PackageWithMembers): number {
  return pkg.members.reduce((sum, m) => sum + m.item.priceCents * m.quantity, 0);
}

export async function createPackage(input: PackageInput): Promise<PackageWithMembers> {
  const pkgId = await db.transaction(async (tx) => {
    const pkg = (
      await tx
        .insert(packages)
        .values({
          name: input.name,
          description: input.description,
          active: input.active,
        })
        .returning()
    )[0];
    for (const m of input.members) {
      await tx
        .insert(packageItems)
        .values({ packageId: pkg.id, itemId: m.itemId, quantity: m.quantity });
    }
    return pkg.id;
  });
  return (await getPackage(pkgId))!;
}

export async function updatePackage(
  id: string,
  input: PackageInput
): Promise<PackageWithMembers | undefined> {
  await db.transaction(async (tx) => {
    await tx
      .update(packages)
      .set({
        name: input.name,
        description: input.description,
        active: input.active,
        updatedAt: new Date(),
      })
      .where(eq(packages.id, id));
    await tx.delete(packageItems).where(eq(packageItems.packageId, id));
    for (const m of input.members) {
      await tx
        .insert(packageItems)
        .values({ packageId: id, itemId: m.itemId, quantity: m.quantity });
    }
  });
  return getPackage(id);
}

export async function deletePackage(id: string): Promise<void> {
  await db.delete(packages).where(eq(packages.id, id));
}
