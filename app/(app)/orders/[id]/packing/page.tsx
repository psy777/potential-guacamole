import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/services/orders";
import { getSettings } from "@/lib/services/settings";
import { PrintButton } from "@/components/print-button";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d);

export default async function PackingListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, settings] = await Promise.all([getOrder(id), getSettings()]);
  if (!order) notFound();

  const c = order.contact;
  // Prefer the shipping address; fall back to billing if shipping is blank.
  const ship = {
    address: c?.shippingAddress || c?.billingAddress || "",
    city: c?.shippingCity || c?.billingCity || "",
    state: c?.shippingState || c?.billingState || "",
    zip: c?.shippingZip || c?.billingZip || "",
  };
  const totalUnits = order.lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="print-sheet">
      <div className="no-print" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <PrintButton label="Print packing list" />
        <Link href={`/orders/${order.id}`} className="btn secondary">Back to order</Link>
      </div>

      <div className="print-head">
        <div>
          <h1 style={{ margin: 0 }}>Packing List</h1>
          <div className="muted">{settings.businessName}</div>
        </div>
        <div className="right">
          <div style={{ fontWeight: 700 }}>{order.number}</div>
          <div className="muted small">{fmtDate(order.createdAt)}</div>
        </div>
      </div>

      <div className="print-shipto">
        <div className="cat-cat">Ship to</div>
        <div style={{ fontWeight: 700 }}>{c?.companyName || "—"}</div>
        {c?.contactName && <div>{c.contactName}</div>}
        {ship.address && <div>{ship.address}</div>}
        {(ship.city || ship.state || ship.zip) && (
          <div>{[ship.city, ship.state].filter(Boolean).join(", ")} {ship.zip}</div>
        )}
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th className="right" style={{ width: "60px" }}>Qty</th>
            <th>Item</th>
            <th>Notes</th>
            <th style={{ width: "36px" }}></th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l) => (
            <tr key={l.id}>
              <td className="right num" style={{ fontWeight: 700 }}>{l.quantity}</td>
              <td>
                <strong>{l.description}</strong>
                {l.variationName && l.variationName !== "Regular" && (
                  <span className="muted"> · {l.variationName}</span>
                )}
                {l.addOns.length > 0 && (
                  <div className="muted small">+ {l.addOns.map((a) => a.name).join(", ")}</div>
                )}
              </td>
              <td className="muted small">{l.note}</td>
              <td><span className="tick-box" /></td>
            </tr>
          ))}
          <tr>
            <td className="right num" style={{ fontWeight: 700 }}>{totalUnits}</td>
            <td style={{ fontWeight: 700 }}>Total units</td>
            <td colSpan={2}></td>
          </tr>
        </tbody>
      </table>

      {order.notes && (
        <div className="print-notes">
          <div className="cat-cat">Order notes</div>
          <div>{order.notes}</div>
        </div>
      )}
    </div>
  );
}
