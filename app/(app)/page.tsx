import Link from "next/link";
import { getDashboard } from "@/lib/services/dashboard";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/ui";

// Due-date coloring: red if overdue, amber if within 7 days.
function dueClass(date: Date | null): string {
  if (!date) return "muted";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAhead = new Date(startOfToday);
  weekAhead.setDate(weekAhead.getDate() + 7);
  if (date < startOfToday) return "due-overdue";
  if (date <= weekAhead) return "due-soon";
  return "";
}
function fmtDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function Dashboard() {
  const { make, schedule, counts, money } = getDashboard();

  return (
    <>
      <div className="header-row">
        <h1>Dashboard</h1>
        <Link href="/orders/new" className="btn">+ New order</Link>
      </div>

      {/* Triage strip — what needs attention right now. */}
      <div className="stat-grid" style={{ marginTop: "1rem" }}>
        <div className="stat" style={counts.overdue ? { borderColor: "#f0c7c3", background: "#fdf4f3" } : {}}>
          <div className="value" style={counts.overdue ? { color: "#b3261e" } : {}}>{counts.overdue}</div>
          <div className="label">Overdue</div>
        </div>
        <div className="stat" style={counts.dueThisWeek ? { borderColor: "#f0e0c0" } : {}}>
          <div className="value" style={counts.dueThisWeek ? { color: "#b7791f" } : {}}>{counts.dueThisWeek}</div>
          <div className="label">Due this week</div>
        </div>
        <Link href="/orders?status=shipped" className="stat" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="value">{counts.toInvoice}</div>
          <div className="label">To invoice</div>
        </Link>
        <Link href="/orders?status=invoiced" className="stat" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="value">{counts.awaitingPayment}</div>
          <div className="label">Awaiting payment</div>
        </Link>
      </div>

      {/* THE build list: what to make, batched across all active orders. */}
      <h2>To make</h2>
      <p className="muted small" style={{ marginTop: "-0.4rem" }}>
        Total quantity of each item across all open orders — batch these to avoid retooling back and forth.
      </p>
      <div className="card">
        {make.length === 0 ? (
          <p className="muted">Nothing to make right now. Items appear here as soon as an order is created.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Item to make</th>
                <th className="right">Qty</th>
                <th>Earliest due</th>
              </tr>
            </thead>
            <tbody>
              {make.map((m) => (
                <tr key={m.description}>
                  <td>
                    <div>{m.description}</div>
                    <div className="small muted">
                      {m.orders.map((o, i) => (
                        <span key={o.id}>
                          {i > 0 && ", "}
                          <Link href={`/orders/${o.id}`}>{o.number}</Link>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="right num" style={{ fontWeight: 700, fontSize: "1.05rem" }}>{m.quantity}</td>
                  <td className={`num ${dueClass(m.earliestDueDate)}`}>{fmtDate(m.earliestDueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Order-centric schedule: which orders ship when. */}
      <h2>Fulfillment schedule</h2>
      <div className="card">
        {schedule.length === 0 ? (
          <p className="muted">No open orders. New orders show up here, soonest due first.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Due</th>
                <th>Status</th>
                <th className="right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/orders/${o.id}`}>{o.number}</Link></td>
                  <td>{o.contactName ?? "—"}</td>
                  <td className={`num ${dueClass(o.dueDate)}`}>{fmtDate(o.dueDate)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="right num">
                    {o.balanceCents > 0 ? formatMoney(o.balanceCents, o.currency) : "Paid"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cash health — secondary. */}
      <h2>Cash</h2>
      <div className="stat-grid">
        <div className="stat">
          <div className="value">{formatMoney(money.collectedThisMonthCents)}</div>
          <div className="label">Collected this month</div>
        </div>
        <div className="stat">
          <div className="value">{formatMoney(money.outstandingCents)}</div>
          <div className="label">Outstanding (invoiced, unpaid)</div>
        </div>
      </div>
    </>
  );
}
