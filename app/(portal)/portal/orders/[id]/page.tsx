import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContact } from "@/lib/auth/wholesale";
import { getContactOrder } from "@/lib/services/wholesale";
import { enabledProviders } from "@/lib/services/payments";
import { formatMoney } from "@/lib/money";
import { reorderAction, payInvoiceAction } from "../../actions";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(d);

export default async function PortalOrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string; paid?: string; err?: string }>;
}) {
  const contact = await requireContact();
  const { id } = await params;
  const { placed, paid, err } = await searchParams;
  const order = await getContactOrder(contact.id, id);
  if (!order) notFound();

  const balanceCents = Math.max(0, order.totalCents - order.amountPaidCents);
  const canPay =
    order.status === "invoiced" && balanceCents > 0 && enabledProviders().length > 0;

  return (
    <>
      {placed && (
        <div className="notice ok">
          Thank you! Your order has been placed. Comfort Cross will confirm shipping
          and send an invoice.
        </div>
      )}
      {paid && (
        <div className="notice ok">
          Thank you — your payment was received. It may take a moment to reflect below.
        </div>
      )}
      {err === "nopay" && (
        <div className="notice error">
          Online payment isn&apos;t available right now. Please contact Comfort Cross.
        </div>
      )}

      <div className="header-row">
        <div>
          <h1 style={{ marginBottom: "0.15rem" }}>{order.number}</h1>
          <span className="muted">Placed {fmtDate(order.createdAt)}</span>
        </div>
        <span className={`badge ${order.status}`}>{order.status}</span>
      </div>

      {canPay && (
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            borderColor: "var(--brand)",
          }}
        >
          <div>
            <strong>Balance due: {formatMoney(balanceCents, order.currency)}</strong>
            <div className="muted small">This order has been invoiced — pay securely online.</div>
          </div>
          <form action={payInvoiceAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <button type="submit" className="btn">Pay this invoice</button>
          </form>
        </div>
      )}

      <div className="card">
        <table className="ws-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Unit price</th>
              <th className="num">Qty</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong>{l.description}</strong>
                  {l.variationName && l.variationName !== "Regular" && (
                    <span className="muted"> · {l.variationName}</span>
                  )}
                </td>
                <td className="num">{formatMoney(l.unitPriceCents, order.currency)}</td>
                <td className="num">{l.quantity}</td>
                <td className="num">{formatMoney(l.lineTotalCents, order.currency)}</td>
              </tr>
            ))}
            <tr className="ws-total-row">
              <td colSpan={3}>Subtotal</td>
              <td className="num">{formatMoney(order.subtotalCents, order.currency)}</td>
            </tr>
            {order.shippingCents > 0 && (
              <tr>
                <td colSpan={3}>Shipping</td>
                <td className="num">{formatMoney(order.shippingCents, order.currency)}</td>
              </tr>
            )}
            {order.taxCents > 0 && (
              <tr>
                <td colSpan={3}>Tax</td>
                <td className="num">{formatMoney(order.taxCents, order.currency)}</td>
              </tr>
            )}
            <tr className="ws-total-row">
              <td colSpan={3}>Total</td>
              <td className="num">{formatMoney(order.totalCents, order.currency)}</td>
            </tr>
            {order.amountPaidCents > 0 && (
              <tr>
                <td colSpan={3}>Paid</td>
                <td className="num">{formatMoney(order.amountPaidCents, order.currency)}</td>
              </tr>
            )}
            {balanceCents > 0 && order.status !== "open" && (
              <tr className="ws-total-row">
                <td colSpan={3}>Balance due</td>
                <td className="num">{formatMoney(balanceCents, order.currency)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {order.trackingNumber && (
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Tracking: <strong>{order.trackingNumber}</strong>
            {order.trackingStatus ? ` — ${order.trackingStatus}` : ""}
          </p>
        )}
      </div>

      <div className="actions" style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <form action={reorderAction}>
          <input type="hidden" name="orderId" value={order.id} />
          <button type="submit" className="btn">
            Reorder these items
          </button>
        </form>
        <Link href="/portal/orders" className="btn secondary">
          Back to orders
        </Link>
      </div>
    </>
  );
}
