import Link from "next/link";
import { requireContact } from "@/lib/auth/wholesale";
import { listContactOrders } from "@/lib/services/wholesale";
import { formatMoney } from "@/lib/money";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d);

export default async function PortalOrdersPage() {
  const contact = await requireContact();
  const orders = await listContactOrders(contact.id);

  return (
    <>
      <div className="portal-hero">
        <h1>Your orders</h1>
        <p>Every order you&apos;ve placed. Open one to see details or reorder it.</p>
      </div>

      {orders.length === 0 ? (
        <div className="card ws-empty">
          <p>You haven&apos;t placed any orders yet.</p>
          <Link href="/portal/catalog" className="btn" style={{ marginTop: "0.5rem" }}>
            Browse catalog
          </Link>
        </div>
      ) : (
        <div className="card">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Status</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/portal/orders/${o.id}`}>{o.number}</Link>
                  </td>
                  <td>{fmtDate(o.createdAt)}</td>
                  <td>
                    <span className={`badge ${o.status}`}>{o.status}</span>
                  </td>
                  <td className="num">{formatMoney(o.totalCents, o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
