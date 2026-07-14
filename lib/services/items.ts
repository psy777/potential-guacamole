import { asc, eq, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { items, type Item } from "@/lib/db/schema";

export type ItemInput = Omit<Item, "id" | "createdAt" | "updatedAt">;

export function listItems(search?: string): Item[] {
  const q = db.select().from(items);
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    return q
      .where(or(like(items.name, term), like(items.sku, term)))
      .orderBy(asc(items.name))
      .all();
  }
  return q.orderBy(asc(items.name)).all();
}

export function getItem(id: string): Item | undefined {
  return db.select().from(items).where(eq(items.id, id)).get();
}

export function createItem(input: ItemInput): Item {
  return db.insert(items).values(input).returning().get();
}

export function updateItem(
  id: string,
  input: Partial<ItemInput>
): Item | undefined {
  db.update(items)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(items.id, id))
    .run();
  return getItem(id);
}

export function deleteItem(id: string): void {
  db.delete(items).where(eq(items.id, id)).run();
}
