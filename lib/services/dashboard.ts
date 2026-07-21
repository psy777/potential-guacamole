import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orders,
  orderLineItems,
  contacts,
  payments,
  type Order,
} from "@/lib/db/schema";

export type ScheduleRow = Order & {
  contactName: string | null;
  balanceCents: number;
};

/** One row of the "what to make" list — demand for one item+variation, summed across orders. */
export type MakeLine = {
  description: string;
  variationName: string;
  quantity: number;
  orderCount: number;
  earliestDueDate: Date | null;
  orders: { id: string; number: string; dueDate: Date | null }[];
};

export type DashboardData = {
  make: MakeLine[];
  schedule: ScheduleRow[];
  counts: {
    overdue: number;
    dueThisWeek: number;
    toInvoice: number;
    awaitingPayment: number;
  };
  money: {
    collectedThisMonthCents: number;
    outstandingCents: number;
  };
};

/** Sort helper: things with a due date come first (soonest first), then the rest. */
function byDueDate(a: Date | null, b: Date | null): number {
  if (a && b) return a.getTime() - b.getTime();
  if (a) return -1;
  if (b) return 1;
  return 0;
}

async function rowsFor(status: Order["status"]): Promise<ScheduleRow[]> {
  const rows = await db
    .select({ o: orders, contactName: contacts.companyName })
    .from(orders)
    .leftJoin(contacts, eq(orders.contactId, contacts.id))
    .where(eq(orders.status, status));
  return rows.map((r) => ({
    ...r.o,
    contactName: r.contactName,
    balanceCents: Math.max(0, r.o.totalCents - r.o.amountPaidCents),
  }));
}

export async function getDashboard(): Promise<DashboardData> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAhead = new Date(startOfToday);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // "Open" orders are the production backlog — the things still to make & ship.
  const open = await rowsFor("open");
  const schedule = [...open].sort((a, b) => byDueDate(a.dueDate, b.dueDate));
  const overdue = open.filter((o) => o.dueDate && o.dueDate < startOfToday);
  const dueThisWeek = open.filter(
    (o) => o.dueDate && o.dueDate >= startOfToday && o.dueDate <= weekAhead
  );

  // Shipped-but-not-invoiced = "send the bill." Invoiced-unpaid = "chase payment."
  const toInvoice =
    (
      await db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(eq(orders.status, "shipped"))
    )[0]?.n ?? 0;
  const invoiced = await rowsFor("invoiced");
  const awaitingPayment = invoiced.filter((o) => o.balanceCents > 0).length;
  const outstandingCents = invoiced.reduce((s, o) => s + o.balanceCents, 0);

  const collectedThisMonthCents =
    (
      await db
        .select({ t: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
        .from(payments)
        .where(and(eq(payments.status, "succeeded"), gte(payments.createdAt, startOfMonth)))
    )[0]?.t ?? 0;

  return {
    make: await aggregateMake(open),
    schedule,
    counts: {
      overdue: overdue.length,
      dueThisWeek: dueThisWeek.length,
      toInvoice,
      awaitingPayment,
    },
    money: { collectedThisMonthCents, outstandingCents },
  };
}

/** Aggregate line-item demand across the open orders, grouped by description. */
async function aggregateMake(open: ScheduleRow[]): Promise<MakeLine[]> {
  if (open.length === 0) return [];
  const orderById = new Map(open.map((o) => [o.id, o]));
  const lines = await db
    .select()
    .from(orderLineItems)
    .where(
      inArray(
        orderLineItems.orderId,
        open.map((o) => o.id)
      )
    );

  const map = new Map<string, MakeLine>();
  for (const l of lines) {
    const order = orderById.get(l.orderId);
    if (!order) continue;
    const description = l.description.trim() || "(no description)";
    const variationName = l.variationName?.trim() ?? "";
    // Group by item AND variation so a batch is a real, makeable unit
    // (e.g. "Blessed Assurance · Rugged"), not a washed-out item total.
    const key = `${description}|||${variationName}`;
    let entry = map.get(key);
    if (!entry) {
      entry = { description, variationName, quantity: 0, orderCount: 0, earliestDueDate: null, orders: [] };
      map.set(key, entry);
    }
    entry.quantity += l.quantity;
    if (!entry.orders.some((x) => x.id === order.id)) {
      entry.orders.push({ id: order.id, number: order.number, dueDate: order.dueDate });
      entry.orderCount += 1;
    }
    if (order.dueDate && (!entry.earliestDueDate || order.dueDate < entry.earliestDueDate)) {
      entry.earliestDueDate = order.dueDate;
    }
  }

  return [...map.values()].sort(
    (a, b) => byDueDate(a.earliestDueDate, b.earliestDueDate) || b.quantity - a.quantity
  );
}
