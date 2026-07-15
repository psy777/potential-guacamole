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
function nextSeq(tx: Tx): number {
  tx.insert(counters)
    .values({ name: "order", value: 1000 })
    .onConflictDoNothing()
    .run();
  tx.update(counters)
    .set({ value: sql`${counters.value} + 1` })
    .where(eq(counters.name, "order"))
    .run();
  const row = tx
    .select()
    .from(counters)
    .where(eq(counters.name, "order"))
    .get();
  return row?.value ?? 1001;
}

/** The number a new order WOULD get, without consuming it (for prefill). */
export function peekNextInvoiceId(): string {
  const row = db
    .select()
    .from(counters)
    .where(eq(counters.name, "order"))
    .get();
  return String((row?.value ?? 1000) + 1);
}

export function listOrders(opts?: {
  status?: string;
  search?: string;
}): (Order & { contactName: string | null })[] {
  const conditions = [];
  if (opts?.status) conditions.push(eq(orders.status, opts.status as Order["status"]));
  if (opts?.search && opts.search.trim()) {
    const term = `%${opts.search.trim()}%`;
    conditions.push(or(like(orders.number, term), like(orders.notes, term)));
  }
  const rows = db
    .select({ order: orders, contactName: contacts.companyName })
    .from(orders)
    .leftJoin(contacts, eq(orders.contactId, contacts.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt))
    .all();
  return rows.map((r) => ({ ...r.order, contactName: r.contactName }));
}

export function getOrder(id: string): FullOrder | undefined {
  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return undefined;
  const contact = order.contactId
    ? db.select().from(contacts).where(eq(contacts.id, order.contactId)).get() ?? null
    : null;
  return {
    ...order,
    contact,
    lines: db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, id))
      .orderBy(orderLineItems.position)
      .all(),
    payments: db
      .select()
      .from(payments)
      .where(eq(payments.orderId, id))
      .orderBy(desc(payments.createdAt))
      .all(),
    documents: db
      .select()
      .from(documents)
      .where(eq(documents.orderId, id))
      .orderBy(desc(documents.createdAt))
      .all(),
    history: db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, id))
      .orderBy(desc(orderStatusHistory.createdAt))
      .all(),
  };
}

export function createOrder(
  input: OrderInput,
  user: { id: string; name: string }
): string {
  const totals = computeTotals(input, getSettings().processingFeePercent);
  return db.transaction((tx) => {
    const seq = nextSeq(tx);
    const number = `ORD-${seq}`;
    const invoiceId = input.invoiceId.trim() || String(seq);
    const order = tx
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
      .get();

    input.lines.forEach((l, i) => {
      tx.insert(orderLineItems)
        .values({
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
        })
        .run();
    });

    tx.insert(orderStatusHistory)
      .values({
        orderId: order.id,
        status: "open",
        note: "Order created",
        userName: user.name,
      })
      .run();

    return order.id;
  });
}

export function updateOrder(id: string, input: OrderInput): void {
  const totals = computeTotals(input, getSettings().processingFeePercent);
  db.transaction((tx) => {
    // Backfill a missing invoice ID from the order's OWN number, not a new
    // sequence value — so it stays matched to ORD-N.
    let invoiceId = input.invoiceId.trim();
    if (!invoiceId) {
      const cur = tx
        .select({ number: orders.number })
        .from(orders)
        .where(eq(orders.id, id))
        .get();
      invoiceId = (cur?.number ?? "").replace(/^ORD-/, "");
    }
    tx.update(orders)
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
      .where(eq(orders.id, id))
      .run();

    tx.delete(orderLineItems).where(eq(orderLineItems.orderId, id)).run();
    input.lines.forEach((l, i) => {
      tx.insert(orderLineItems)
        .values({
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
        })
        .run();
    });
  });
}

export function setTracking(id: string, trackingNumber: string): void {
  db.update(orders)
    .set({ trackingNumber, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .run();
}

export function setOrderStatus(
  id: string,
  status: Order["status"],
  user: { name: string },
  note = ""
): void {
  db.transaction((tx) => {
    tx.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .run();
    tx.insert(orderStatusHistory)
      .values({ orderId: id, status, note, userName: user.name })
      .run();
  });
}

/**
 * Recompute how much has been paid from the payments table and update the
 * order. "Paid in full" is DERIVED here — it is never a manual flag.
 */
export function recomputeOrderPaid(orderId: string): void {
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) return;

  const paidRow = db
    .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)` })
    .from(payments)
    .where(
      and(eq(payments.orderId, orderId), eq(payments.status, "succeeded"))
    )
    .get();
  const amountPaidCents = paidRow?.total ?? 0;

  db.update(orders)
    .set({ amountPaidCents, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .run();

  // Auto-advance an invoiced order to "paid" once fully covered. Payment that
  // arrives earlier (a prepaid/web order) is still recorded, but the order
  // stays "open" because it still needs making.
  const fullyPaid = order.totalCents > 0 && amountPaidCents >= order.totalCents;
  if (fullyPaid && order.status === "invoiced") {
    setOrderStatus(orderId, "paid", { name: "System" }, "Payment received in full");
  }
}

/** Record a payment that was NOT taken through Stripe/Square (cash, check…). */
export function recordManualPayment(
  orderId: string,
  amountCents: number,
  method: string,
  currency: string
): void {
  db.insert(payments)
    .values({
      orderId,
      provider: "manual",
      providerPaymentId: `manual-${crypto.randomUUID()}`,
      amountCents,
      currency,
      status: "succeeded",
      method,
    })
    .run();
  recomputeOrderPaid(orderId);
}

export function deleteOrder(id: string): void {
  db.delete(orders).where(eq(orders.id, id)).run();
}
