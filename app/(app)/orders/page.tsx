import Link from "next/link";
import { listOrders } from "@/lib/services/orders";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/ui";

const STATUSES = ["", "draft", "sent", "paid", "shipped", "cancelled"];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const orders = listOrders({ status: status || undefined, search: q });

  return (
    <>
      <div className="header-row">
        <h1>Orders</h1>
        <Link href="/orders/new" className="btn">+ New order</Link>
      </div>

      <div className="card" style={{ padding: "0.75rem 1rem" }}>
        <div className="actions">
          {STATUSES.map((s) => (
            <Link
              key={s || "all"}
              href={s ? `/orders?status=${s}` : "/orders"}
              className={`btn btn-sm ${status === s || (!status && !s) ? "" : "secondary"}`}
            >
              {s || "All"}
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        {orders.length === 0 ? (
          <p className="muted">No orders found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th className="right">Total</th>
                <th className="right">Paid</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/orders/${o.id}`}>{o.number}</Link>
                  </td>
                  <td>{o.contactName ?? "—"}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="right num">{formatMoney(o.totalCents, o.currency)}</td>
                  <td className="right num">{formatMoney(o.amountPaidCents, o.currency)}</td>
                  <td className="small muted">
                    {new Date(o.createdAt).toLocaleDateString("en-US")}
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
