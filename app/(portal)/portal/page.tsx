import Link from "next/link";
import { requireContact } from "@/lib/auth/wholesale";
import { listContactOrders } from "@/lib/services/wholesale";
import { getSettings } from "@/lib/services/settings";
import { effectiveDiscountPercent } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";

export default async function PortalHome() {
  const contact = await requireContact();
  const [orders, settings] = await Promise.all([
    listContactOrders(contact.id),
    getSettings(),
  ]);
  const discount = effectiveDiscountPercent(
    contact.wholesaleDiscountPercent,
    settings.wholesaleDiscountPercent
  );
  const recent = orders.slice(0, 5);
  const firstName = contact.contactName?.split(" ")[0] || contact.companyName;

  return (
    <>
      <div className="portal-hero">
        <h1>Welcome back, {firstName}</h1>
        <p>Browse the catalog, reorder past favorites, and track your orders.</p>
      </div>

      {discount > 0 && (
        <div className="discount-note" style={{ marginBottom: "1rem" }}>
          Your account pricing: <strong>{discount}% off retail</strong> on every
          item, unless a specific wholesale price applies.
        </div>
      )}

      <div className="grid2">
        <div className="card">
          <div className="header-row">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Start an order</h2>
          </div>
          <p className="muted">Your wholesale prices are shown throughout the catalog.</p>
          <Link href="/portal/catalog" className="btn">
            Browse catalog
          </Link>
        </div>

        <div className="card">
          <div className="header-row">
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Recent orders</h2>
            <Link href="/portal/orders" className="btn ghost btn-sm">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="muted">No orders yet.</p>
          ) : (
            <table className="ws-table">
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/portal/orders/${o.id}`}>{o.number}</Link>
                    </td>
                    <td>
                      <span className={`badge ${o.status}`}>{o.status}</span>
                    </td>
                    <td className="num">{formatMoney(o.totalCents, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
