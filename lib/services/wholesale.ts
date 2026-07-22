import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  items,
  itemVariations,
  orders,
  orderLineItems,
  orderLineAddOns,
  orderStatusHistory,
  wholesaleCartItems,
  type Contact,
  type Order,
  type OrderLineItem,
  type OrderLineAddOn,
} from "@/lib/db/schema";
import { getSettings } from "@/lib/services/settings";
import { nextSeq } from "@/lib/services/orders";
import { itemAddOns_, addOnsByIds, type AddOnView } from "@/lib/services/addons";
import { effectiveDiscountPercent, wholesaleUnitPriceCents } from "@/lib/pricing";

/** Canonical key for a set of add-on ids (sorted, de-duped) — cart line identity. */
function addOnKey(ids: string[]): string {
  return JSON.stringify([...new Set(ids.filter(Boolean))].sort());
}
function parseAddOnKey(key: string): string[] {
  try {
    const v = JSON.parse(key);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export type PortalVariation = {
  variationId: string;
  itemId: string;
  itemName: string;
  variationName: string;
  sku: string;
  imagePath: string;
  msrpCents: number;
  wholesaleCents: number;
  explicit: boolean; // true when priced by an explicit wholesale price, not the %
};

export type PortalCatalogItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  imagePath: string;
  variations: PortalVariation[];
  addOns: AddOnView[]; // optional priced extras offered on this item
};

export type CartLine = {
  cartItemId: string;
  itemId: string;
  variationId: string | null;
  itemName: string;
  variationName: string;
  quantity: number;
  baseUnitCents: number; // variation price before add-ons
  addOns: AddOnView[]; // add-ons on this line
  unitPriceCents: number; // baseUnit + add-ons
  lineTotalCents: number;
};

export type CartView = { lines: CartLine[]; subtotalCents: number; count: number };

/** The discount % that applies to this contact right now. */
async function discountFor(contact: Contact): Promise<number> {
  const settings = await getSettings();
  return effectiveDiscountPercent(
    contact.wholesaleDiscountPercent,
    settings.wholesaleDiscountPercent
  );
}

/** The whole active catalog, priced for this contact. */
export async function portalCatalog(contact: Contact): Promise<PortalCatalogItem[]> {
  const discount = await discountFor(contact);
  const rows = await db
    .select({ item: items, variation: itemVariations })
    .from(items)
    .innerJoin(itemVariations, eq(itemVariations.itemId, items.id))
    .where(and(eq(items.active, true), eq(itemVariations.active, true)))
    .orderBy(asc(items.name), asc(itemVariations.position));

  const byItem = new Map<string, PortalCatalogItem>();
  for (const { item, variation } of rows) {
    let group = byItem.get(item.id);
    if (!group) {
      group = {
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        imagePath: item.imagePath,
        variations: [],
        addOns: [], // grid doesn't need add-ons; the detail page loads them
      };
      byItem.set(item.id, group);
    }
    group.variations.push({
      variationId: variation.id,
      itemId: item.id,
      itemName: item.name,
      variationName: variation.name,
      sku: variation.sku,
      imagePath: variation.imagePath || item.imagePath,
      msrpCents: variation.priceCents,
      wholesaleCents: wholesaleUnitPriceCents(
        variation.priceCents,
        variation.wholesalePriceCents,
        discount
      ),
      explicit: variation.wholesalePriceCents != null,
    });
  }
  return [...byItem.values()];
}

/** One active item with its variations, priced for this contact. */
export async function getPortalItem(
  contact: Contact,
  itemId: string
): Promise<PortalCatalogItem | null> {
  const discount = await discountFor(contact);
  const rows = await db
    .select({ item: items, variation: itemVariations })
    .from(items)
    .innerJoin(itemVariations, eq(itemVariations.itemId, items.id))
    .where(
      and(
        eq(items.id, itemId),
        eq(items.active, true),
        eq(itemVariations.active, true)
      )
    )
    .orderBy(asc(itemVariations.position));
  if (rows.length === 0) return null;
  const item = rows[0].item;
  const addOns = await itemAddOns_(itemId);
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    imagePath: item.imagePath,
    addOns,
    variations: rows.map(({ variation }) => ({
      variationId: variation.id,
      itemId: item.id,
      itemName: item.name,
      variationName: variation.name,
      sku: variation.sku,
      imagePath: variation.imagePath || item.imagePath,
      msrpCents: variation.priceCents,
      wholesaleCents: wholesaleUnitPriceCents(
        variation.priceCents,
        variation.wholesalePriceCents,
        discount
      ),
      explicit: variation.wholesalePriceCents != null,
    })),
  };
}

/** Read the contact's cart, pricing each line at the current wholesale price. */
export async function getCart(contact: Contact): Promise<CartView> {
  const discount = await discountFor(contact);
  const rows = await db
    .select({ cart: wholesaleCartItems, variation: itemVariations, item: items })
    .from(wholesaleCartItems)
    .innerJoin(itemVariations, eq(wholesaleCartItems.variationId, itemVariations.id))
    .innerJoin(items, eq(wholesaleCartItems.itemId, items.id))
    .where(eq(wholesaleCartItems.contactId, contact.id))
    .orderBy(asc(items.name), asc(itemVariations.position));

  // Batch-load every add-on referenced across the cart, priced from the library.
  const allIds = rows.flatMap(({ cart }) => parseAddOnKey(cart.addOnIds));
  const addOnMap = new Map((await addOnsByIds(allIds)).map((a) => [a.id, a]));

  const lines: CartLine[] = rows.map(({ cart, variation, item }) => {
    const base = wholesaleUnitPriceCents(
      variation.priceCents,
      variation.wholesalePriceCents,
      discount
    );
    const addOns = parseAddOnKey(cart.addOnIds)
      .map((id) => addOnMap.get(id))
      .filter((a): a is AddOnView => Boolean(a));
    const unit = base + addOns.reduce((s, a) => s + a.priceCents, 0);
    return {
      cartItemId: cart.id,
      itemId: item.id,
      variationId: variation.id,
      itemName: item.name,
      variationName: variation.name,
      quantity: cart.quantity,
      baseUnitCents: base,
      addOns,
      unitPriceCents: unit,
      lineTotalCents: unit * cart.quantity,
    };
  });

  return {
    lines,
    subtotalCents: lines.reduce((s, l) => s + l.lineTotalCents, 0),
    count: lines.reduce((s, l) => s + l.quantity, 0),
  };
}

/** How many units are in the cart (for the nav badge). */
export async function cartCount(contactId: string): Promise<number> {
  const row = (
    await db
      .select({ n: sql<number>`coalesce(sum(${wholesaleCartItems.quantity}), 0)::int` })
      .from(wholesaleCartItems)
      .where(eq(wholesaleCartItems.contactId, contactId))
  )[0];
  return row?.n ?? 0;
}

/**
 * Add a variation (with an optional set of add-ons) to the cart. The same
 * variation with the same add-ons bumps quantity; a different add-on set is a
 * separate line. Add-on ids are validated against the item's offered add-ons.
 * Returns false when the variation no longer exists (a stale portal page after
 * the item was edited in the Studio) — callers show a notice, never a crash.
 */
export async function addToCart(
  contactId: string,
  itemId: string,
  variationId: string,
  quantity = 1,
  addOnIds: string[] = []
): Promise<boolean> {
  // Verify the variation still exists, belongs to this item, and is active —
  // the ids on a rendered page can go stale if the item is edited meanwhile.
  const variation = (
    await db
      .select({ id: itemVariations.id })
      .from(itemVariations)
      .innerJoin(items, eq(itemVariations.itemId, items.id))
      .where(
        and(
          eq(itemVariations.id, variationId),
          eq(itemVariations.itemId, itemId),
          eq(itemVariations.active, true),
          eq(items.active, true)
        )
      )
      .limit(1)
  )[0];
  if (!variation) return false;

  const qty = Math.max(1, Math.round(quantity));
  // Only keep add-ons actually offered on this item.
  const offered = new Set((await itemAddOns_(itemId)).map((a) => a.id));
  const key = addOnKey(addOnIds.filter((id) => offered.has(id)));
  await db
    .insert(wholesaleCartItems)
    .values({ contactId, itemId, variationId, addOnIds: key, quantity: qty })
    .onConflictDoUpdate({
      target: [
        wholesaleCartItems.contactId,
        wholesaleCartItems.variationId,
        wholesaleCartItems.addOnIds,
      ],
      set: { quantity: sql`${wholesaleCartItems.quantity} + ${qty}` },
    });
  return true;
}

/** Set an exact quantity for a cart line (removes it at 0). Scoped to owner. */
export async function setCartQuantity(
  contactId: string,
  cartItemId: string,
  quantity: number
): Promise<void> {
  const qty = Math.round(quantity);
  if (qty <= 0) {
    await removeCartItem(contactId, cartItemId);
    return;
  }
  await db
    .update(wholesaleCartItems)
    .set({ quantity: qty })
    .where(
      and(eq(wholesaleCartItems.id, cartItemId), eq(wholesaleCartItems.contactId, contactId))
    );
}

export async function removeCartItem(contactId: string, cartItemId: string): Promise<void> {
  await db
    .delete(wholesaleCartItems)
    .where(
      and(eq(wholesaleCartItems.id, cartItemId), eq(wholesaleCartItems.contactId, contactId))
    );
}

export async function clearCart(contactId: string): Promise<void> {
  await db.delete(wholesaleCartItems).where(eq(wholesaleCartItems.contactId, contactId));
}

/**
 * Turn the contact's cart into a real order (status "open") priced at wholesale,
 * then empty the cart. Returns the new order id, or null if the cart was empty.
 * The order flows into Studio like any other, where the parents add shipping and
 * invoice it.
 */
export async function placeOrder(contact: Contact): Promise<string | null> {
  const cart = await getCart(contact);
  if (cart.lines.length === 0) return null;

  return db.transaction(async (tx) => {
    const seq = await nextSeq(tx);
    const number = `ORD-${seq}`;
    const order = (
      await tx
        .insert(orders)
        .values({
          number,
          invoiceId: String(seq),
          contactId: contact.id,
          status: "open",
          currency: (await getSettings()).defaultCurrency,
          subtotalCents: cart.subtotalCents,
          totalCents: cart.subtotalCents,
          title: `${contact.companyName} — wholesale order`,
          notes: "Placed via the wholesale portal.",
          createdBy: null,
        })
        .returning()
    )[0];

    for (let i = 0; i < cart.lines.length; i++) {
      const l = cart.lines[i];
      const line = (
        await tx
          .insert(orderLineItems)
          .values({
            orderId: order.id,
            itemId: l.itemId,
            description: l.itemName,
            variationName: l.variationName,
            quantity: l.quantity,
            unitPriceCents: l.unitPriceCents, // already includes add-ons
            lineTotalCents: l.lineTotalCents,
            position: i,
          })
          .returning()
      )[0];
      for (const a of l.addOns) {
        await tx.insert(orderLineAddOns).values({
          orderLineItemId: line.id,
          addOnId: a.id,
          name: a.name,
          priceCents: a.priceCents,
        });
      }
    }

    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      status: "open",
      note: "Order placed via wholesale portal",
      userName: contact.companyName,
    });

    await tx.delete(wholesaleCartItems).where(eq(wholesaleCartItems.contactId, contact.id));
    return order.id;
  });
}

// --- Order history (always scoped to the owning contact) --------------------

export async function listContactOrders(contactId: string): Promise<Order[]> {
  return db
    .select()
    .from(orders)
    .where(eq(orders.contactId, contactId))
    .orderBy(desc(orders.createdAt));
}

export type OrderLineWithAddOns = OrderLineItem & { addOns: OrderLineAddOn[] };

export async function getContactOrder(
  contactId: string,
  orderId: string
): Promise<(Order & { lines: OrderLineWithAddOns[] }) | null> {
  const order = (
    await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.contactId, contactId)))
      .limit(1)
  )[0];
  if (!order) return null;
  const lines = await db
    .select()
    .from(orderLineItems)
    .where(eq(orderLineItems.orderId, orderId))
    .orderBy(asc(orderLineItems.position));
  const addOnRows = lines.length
    ? await db
        .select()
        .from(orderLineAddOns)
        .where(inArray(orderLineAddOns.orderLineItemId, lines.map((l) => l.id)))
    : [];
  return {
    ...order,
    lines: lines.map((l) => ({
      ...l,
      addOns: addOnRows.filter((a) => a.orderLineItemId === l.id),
    })),
  };
}

/**
 * Copy a past order's still-available lines back into the cart. Returns how many
 * lines were added and how many were skipped (item/variation no longer sold).
 */
export async function reorderIntoCart(
  contactId: string,
  orderId: string
): Promise<{ added: number; skipped: number }> {
  const past = await getContactOrder(contactId, orderId);
  if (!past) return { added: 0, skipped: 0 };

  let added = 0;
  let skipped = 0;
  for (const line of past.lines) {
    if (!line.itemId) {
      skipped++;
      continue;
    }
    // Re-resolve the variation by name against the current catalog so we never
    // resurrect a deleted/renamed SKU.
    const variation = (
      await db
        .select({ v: itemVariations })
        .from(itemVariations)
        .innerJoin(items, eq(itemVariations.itemId, items.id))
        .where(
          and(
            eq(itemVariations.itemId, line.itemId),
            eq(itemVariations.name, line.variationName || "Regular"),
            eq(itemVariations.active, true),
            eq(items.active, true)
          )
        )
        .limit(1)
    )[0];
    if (!variation) {
      skipped++;
      continue;
    }
    // Carry forward the add-ons that still exist (addOnId survives on the snapshot).
    const addOnIds = line.addOns.map((a) => a.addOnId).filter((x): x is string => Boolean(x));
    const ok = await addToCart(contactId, line.itemId, variation.v.id, line.quantity, addOnIds);
    if (ok) added++;
    else skipped++;
  }
  return { added, skipped };
}
