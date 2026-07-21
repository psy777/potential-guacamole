import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/services/settings";
import {
  orders,
  orderLineItems,
  orderStatusHistory,
  payments,
  documents,
  contacts,
  counters,
  type Order,
  type OrderLineItem,
  type Payment,
  type DocumentRow,
  type Contact,
} from "@/lib/db/schema";

export type LineInput = {
  itemId?: string | null;
  packageId?: string | null;
  description: string;
  variationName: string;
  note: string;
  quantity: number;
  unitPriceCents: number;
};

export type OrderInput = {
  contactId?: string | null;
  currency: string;
  notes: string;
  title: string;
  invoiceId: string;
  invoiceMessage: string;
  applyProcessingFee: boolean;
  dueDate: Date | null;
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  lines: LineInput[];
};

export type OrderTotals = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  processingFeeCents: number;
  totalCents: number;
};

export type FullOrder = Order & {
  contact: Contact | null;
  lines: OrderLineItem[];
  payments: Payment[];
  documents: DocumentRow[];
  history: (typeof orderStatusHistory.$inferSelect)[];
};

/**
 * Pure function: compute all totals from an order input. Integer cents only.
 * The processing fee is a % surcharge on the pre-fee total, applied only when
 * the order opts in and a rate is configured.
 */
export function computeTotals(
  input: OrderInput,
  processingFeePercent = 0
): OrderTotals {
  const subtotalCents = input.lines.reduce(
    (sum, l) => sum + Math.round(l.unitPriceCents) * Math.round(l.quantity),
    0
  );
  const preFeeCents = Math.max(
    0,
    subtotalCents - input.discountCents + input.taxCents + input.shippingCents
  );
  const processingFeeCents =
    input.applyProcessingFee && processingFeePercent > 0
      ? Math.round((preFeeCents * processingFeePercent) / 100)
      : 0;
  return {
    subtotalCents,
    discountCents: input.discountCents,
    taxCents: input.taxCents,
    shippingCents: input.shippingCents,
    processingFeeCents,
    totalCents: preFeeCents + processingFeeCents,
  };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// One incrementing sequence feeds BOTH the internal order number (ORD-N) and
// the customer-facing invoice ID, so they always share the same number.
async function nextSeq(tx: Tx): Promise<number> {
  await tx
    .insert(counters)
    .values({ name: "order", value: 1000 })
    .onConflictDoNothing();
  await tx
    .update(counters)
    .set({ value: sql`${counters.value} + 1` })
    .where(eq(counters.name, "order"));
  const row = (
    await tx.select().from(counters).where(eq(counters.name, "order")).limit(1)
  )[0];
  return row?.value ?? 1001;
}

/** The number a new order WOULD get, without consuming it (for prefill). */
export async function peekNextInvoiceId(): Promise<string> {
  const row = (
    await db.select().from(counters).where(eq(counters.name, "order")).limit(1)
  )[0];
  return String((row?.value ?? 1000) + 1);
}

export async function listOrders(opts?: {
  status?: string;
  search?: string;
}): Promise<(Order & { contactName: string | null })[]> {
  const conditions = [];
  if (opts?.status) conditions.push(eq(orders.status, opts.status as Order["status"]));
  if (opts?.search && opts.search.trim()) {
    const term = `%${opts.search.trim()}%`;
    conditions.push(or(like(orders.number, term), like(orders.notes, term)));
  }
  const rows = await db
    .select({ order: orders, contactName: contacts.companyName })
    .from(orders)
    .leftJoin(contacts, eq(orders.contactId, contacts.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt));
  return rows.map((r) => ({ ...r.order, contactName: r.contactName }));
}

export async function getOrder(id: string): Promise<FullOrder | undefined> {
  const order = (await db.select().from(orders).where(eq(orders.id, id)).limit(1))[0];
  if (!order) return undefined;

  const [contact, lines, pays, docs, history] = await Promise.all([
    order.contactId
      ? db.select().from(contacts).where(eq(contacts.id, order.contactId)).limit(1)
      : Promise.resolve([]),
    db.select().from(orderLineItems).where(eq(orderLineItems.orderId, id)).orderBy(orderLineItems.position),
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(desc(payments.createdAt)),
    db.select().from(documents).where(eq(documents.orderId, id)).orderBy(desc(documents.createdAt)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, id)).orderBy(desc(orderStatusHistory.createdAt)),
  ]);

  return {
    ...order,
    contact: contact[0] ?? null,
    lines,
    payments: pays,
    documents: docs,
    history,
  };
}

export async function createOrder(
  input: OrderInput,
  user: { id: string; name: string }
): Promise<string> {
  const totals = computeTotals(input, (await getSettings()).processingFeePercent);
  return db.transaction(async (tx) => {
    const seq = await nextSeq(tx);
    const number = `ORD-${seq}`;
    const invoiceId = input.invoiceId.trim() || String(seq);
    const order = (
      await tx
        .insert(orders)
        .values({
          number,
          invoiceId,
          contactId: input.contactId ?? null,
          status: "open",
          currency: input.currency,
          subtotalCents: totals.subtotalCents,
          discountCents: totals.discountCents,
          taxCents: totals.taxCents,
          shippingCents: totals.shippingCents,
          processingFeeCents: totals.processingFeeCents,
          totalCents: totals.totalCents,
          notes: input.notes,
          title: input.title,
          invoiceMessage: input.invoiceMessage,
          applyProcessingFee: input.applyProcessingFee,
          dueDate: input.dueDate ?? null,
          createdBy: user.id,
        })
        .returning()
    )[0];

    for (let i = 0; i < input.lines.length; i++) {
      const l = input.lines[i];
      await tx.insert(orderLineItems).values({
        orderId: order.id,
        itemId: l.itemId ?? null,
        packageId: l.packageId ?? null,
        description: l.description,
        variationName: l.variationName ?? "",
        note: l.note ?? "",
        quantity: Math.round(l.quantity),
        unitPriceCents: Math.round(l.unitPriceCents),
        lineTotalCents: Math.round(l.unitPriceCents) * Math.round(l.quantity),
        position: i,
      });
    }

    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      status: "open",
      note: "Order created",
      userName: user.name,
    });

    return order.id;
  });
}

export async function updateOrder(id: string, input: OrderInput): Promise<void> {
  const totals = computeTotals(input, (await getSettings()).processingFeePercent);
  await db.transaction(async (tx) => {
    // Backfill a missing invoice ID from the order's OWN number, not a new
    // sequence value — so it stays matched to ORD-N.
    let invoiceId = input.invoiceId.trim();
    if (!invoiceId) {
      const cur = (
        await tx.select({ number: orders.number }).from(orders).where(eq(orders.id, id)).limit(1)
      )[0];
      invoiceId = (cur?.number ?? "").replace(/^ORD-/, "");
    }
    await tx
      .update(orders)
      .set({
        invoiceId,
        contactId: input.contactId ?? null,
        currency: input.currency,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        taxCents: totals.taxCents,
        shippingCents: totals.shippingCents,
        processingFeeCents: totals.processingFeeCents,
        totalCents: totals.totalCents,
        notes: input.notes,
        title: input.title,
        invoiceMessage: input.invoiceMessage,
        applyProcessingFee: input.applyProcessingFee,
        dueDate: input.dueDate ?? null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    await tx.delete(orderLineItems).where(eq(orderLineItems.orderId, id));
    for (let i = 0; i < input.lines.length; i++) {
      const l = input.lines[i];
      await tx.insert(orderLineItems).values({
        orderId: id,
        itemId: l.itemId ?? null,
        packageId: l.packageId ?? null,
        description: l.description,
        variationName: l.variationName ?? "",
        note: l.note ?? "",
        quantity: Math.round(l.quantity),
        unitPriceCents: Math.round(l.unitPriceCents),
        lineTotalCents: Math.round(l.unitPriceCents) * Math.round(l.quantity),
        position: i,
      });
    }
  });
}

export async function setTracking(id: string, trackingNumber: string): Promise<void> {
  await db
    .update(orders)
    .set({ trackingNumber, updatedAt: new Date() })
    .where(eq(orders.id, id));
}

export async function setOrderStatus(
  id: string,
  status: Order["status"],
  user: { name: string },
  note = ""
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
    await tx.insert(orderStatusHistory).values({ orderId: id, status, note, userName: user.name });
  });
}

/**
 * Recompute how much has been paid from the payments table and update the
 * order. "Paid in full" is DERIVED here — it is never a manual flag.
 */
export async function recomputeOrderPaid(orderId: string): Promise<void> {
  const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!order) return;

  const paidRow = (
    await db
      .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
      .from(payments)
      .where(and(eq(payments.orderId, orderId), eq(payments.status, "succeeded")))
  )[0];
  const amountPaidCents = paidRow?.total ?? 0;

  await db
    .update(orders)
    .set({ amountPaidCents, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  // Auto-advance an invoiced order to "paid" once fully covered. Payment that
  // arrives earlier (a prepaid/web order) is still recorded, but the order
  // stays "open" because it still needs making.
  const fullyPaid = order.totalCents > 0 && amountPaidCents >= order.totalCents;
  if (fullyPaid && order.status === "invoiced") {
    await setOrderStatus(orderId, "paid", { name: "System" }, "Payment received in full");
  }
}

/** Record a payment that was NOT taken through Stripe/Square (cash, check…). */
export async function recordManualPayment(
  orderId: string,
  amountCents: number,
  method: string,
  currency: string
): Promise<void> {
  await db.insert(payments).values({
    orderId,
    provider: "manual",
    providerPaymentId: `manual-${crypto.randomUUID()}`,
    amountCents,
    currency,
    status: "succeeded",
    method,
  });
  await recomputeOrderPaid(orderId);
}

export async function deleteOrder(id: string): Promise<void> {
  await db.delete(orders).where(eq(orders.id, id));
}
