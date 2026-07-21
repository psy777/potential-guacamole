import Link from "next/link";
import { getMakeList } from "@/lib/services/dashboard";
import { getSettings } from "@/lib/services/settings";
import { PrintButton } from "@/components/print-button";

const fmtDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d) : "—";

export default async function MakePrintPage() {
  const [make, settings] = await Promise.all([getMakeList(), getSettings()]);
  const today = new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(new Date());
  const totalUnits = make.reduce((s, m) => s + m.quantity, 0);

  return (
    <div className="print-sheet">
      <div className="no-print" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <PrintButton label="Print to-make list" />
        <Link href="/" className="btn secondary">Back to dashboard</Link>
      </div>

      <div className="print-head">
        <h1 style={{ margin: 0 }}>To Make</h1>
        <div className="muted">
          {settings.businessName} · {today}
        </div>
      </div>

      {make.length === 0 ? (
        <p className="muted">Nothing to make — no open orders.</p>
      ) : (
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: "36px" }}></th>
              <th>Item</th>
              <th className="right">Qty</th>
              <th>Earliest due</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody>
            {make.map((m) => (
              <tr key={`${m.description}|||${m.variationName}`}>
                <td><span className="tick-box" /></td>
                <td>
                  <strong>{m.description}</strong>
                  {m.variationName && m.variationName !== "Regular" && (
                    <span className="muted"> · {m.variationName}</span>
                  )}
                </td>
                <td className="right num" style={{ fontWeight: 700 }}>{m.quantity}</td>
                <td>{fmtDate(m.earliestDueDate)}</td>
                <td className="muted small">{m.orders.map((o) => o.number).join(", ")}</td>
              </tr>
            ))}
            <tr>
              <td></td>
              <td style={{ fontWeight: 700 }}>Total units</td>
              <td className="right num" style={{ fontWeight: 700 }}>{totalUnits}</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
