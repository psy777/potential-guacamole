import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, contacts } from "@/lib/db/schema";
import { listOrders } from "@/lib/services/orders";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/ui";

export default async function Dashboard() {
  const revenueRow = db
    .select({ total: sql<number>`coalesce(sum(${orders.amountPaidCents}), 0)` })
    .from(orders)
    .get();
  const orderCountRow = db
    .select({ n: sql<number>`count(*)` })
    .from(orders)
    .get();
  const openRow = db
    .select({ n: sql<number>`count(*)` })
    .from(orders)
    .where(sql`${orders.status} in ('draft','sent')`)
    .get();
  const contactRow = db
    .select({ n: sql<number>`count(*)` })
    .from(contacts)
    .get();

  const recent = listOrders().slice(0, 8);

  return (
    <>
      <div className="header-row">
        <h1>Dashboard</h1>
        <Link href="/orders/new" className="btn">
          + New order
        </Link>
      </div>

      <div className="stat-grid" style={{ marginTop: "1rem" }}>
        <div className="stat">
          <div className="value">{formatMoney(revenueRow?.total ?? 0)}</div>
          <div className="label">Collected</div>
        </div>
        <div className="stat">
          <div className="value">{orderCountRow?.n ?? 0}</div>
          <div className="label">Orders</div>
        </div>
        <div className="stat">
          <div className="value">{openRow?.n ?? 0}</div>
          <div className="label">Open (draft/sent)</div>
        </div>
        <div className="stat">
          <div className="value">{contactRow?.n ?? 0}</div>
          <div className="label">Contacts</div>
        </div>
      </div>

      <h2>Recent orders</h2>
      <div className="card">
        {recent.length === 0 ? (
          <p className="muted">
            No orders yet. <Link href="/orders/new">Create your first order</Link>.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th className="right">Total</th>
                <th className="right">Paid</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/orders/${o.id}`}>{o.number}</Link>
                  </td>
                  <td>{o.contactName ?? "—"}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="right num">
                    {formatMoney(o.totalCents, o.currency)}
                  </td>
                  <td className="right num">
                    {formatMoney(o.amountPaidCents, o.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
