import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/services/orders";
import { getSettings } from "@/lib/services/settings";
import { enabledProviders } from "@/lib/services/payments";
import { formatMoney } from "@/lib/money";
import { StatusBadge, InlineAction } from "@/components/ui";
import { docuseal as docusealConfig, email as emailConfig } from "@/lib/config";
import {
  setStatusAction,
  manualPaymentAction,
  paymentLinkAction,
  emailInvoiceAction,
  requestSignatureAction,
  deleteOrderAction,
} from "../actions";

const NEXT_STATUS: Record<string, { label: string; status: string }[]> = {
  draft: [
    { label: "Mark sent", status: "sent" },
    { label: "Cancel", status: "cancelled" },
  ],
  sent: [
    { label: "Mark shipped", status: "shipped" },
    { label: "Cancel", status: "cancelled" },
  ],
  paid: [{ label: "Mark shipped", status: "shipped" }],
  shipped: [],
  cancelled: [{ label: "Reopen as draft", status: "draft" }],
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ link?: string; msg?: string; err?: string }>;
}) {
  const { id } = await params;
  const { link, msg, err } = await searchParams;
  const order = getOrder(id);
  if (!order) notFound();

  const settings = getSettings();
  const providers = enabledProviders();
  const fullyPaid =
    order.totalCents > 0 && order.amountPaidCents >= order.totalCents;
  const balanceCents = Math.max(0, order.totalCents - order.amountPaidCents);

  return (
    <>
      {msg && <div className="notice ok">{msg}</div>}
      {err && <div className="notice error">{err}</div>}
      {link && (
        <div className="notice info">
          Payment link created — send this to your customer:
          <br />
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} style={{ marginTop: "0.4rem" }} />
        </div>
      )}

      <div className="header-row">
        <h1>
          {order.number} <StatusBadge status={order.status} />
        </h1>
        <div className="actions">
          <a href={`/api/orders/${order.id}/invoice`} className="btn secondary btn-sm" target="_blank">
            Download invoice
          </a>
          <Link href={`/orders/${order.id}/edit`} className="btn secondary btn-sm">
            Edit
          </Link>
          <InlineAction action={deleteOrderAction} id={order.id} label="Delete" className="btn danger btn-sm" />
        </div>
      </div>

      {NEXT_STATUS[order.status]?.length > 0 && (
        <div className="card" style={{ padding: "0.75rem 1rem" }}>
          <div className="actions">
            {NEXT_STATUS[order.status].map((t) => (
              <form key={t.status} action={setStatusAction}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value={t.status} />
                <button type="submit" className="btn secondary btn-sm">{t.label}</button>
              </form>
            ))}
          </div>
        </div>
      )}

      <div className="grid2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Customer</h2>
          {order.contact ? (
            <div className="stack">
              <div>
                <Link href={`/contacts/${order.contact.id}`}>{order.contact.companyName}</Link>
              </div>
              {order.contact.contactName && <div>{order.contact.contactName}</div>}
              {order.contact.email && <div className="muted small">{order.contact.email}</div>}
              {order.contact.phone && <div className="muted small">{order.contact.phone}</div>}
            </div>
          ) : (
            <p className="muted">No customer attached.</p>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Totals</h2>
          <div className="stack small">
            <Row label="Subtotal" value={formatMoney(order.subtotalCents, order.currency)} />
            {order.discountCents > 0 && <Row label="Discount" value={`-${formatMoney(order.discountCents, order.currency)}`} />}
            {order.taxCents > 0 && <Row label="Tax" value={formatMoney(order.taxCents, order.currency)} />}
            {order.shippingCents > 0 && <Row label="Shipping" value={formatMoney(order.shippingCents, order.currency)} />}
            <Row label="Total" value={formatMoney(order.totalCents, order.currency)} strong />
            <Row label="Paid" value={formatMoney(order.amountPaidCents, order.currency)} />
            <Row label="Balance" value={formatMoney(balanceCents, order.currency)} strong />
          </div>
          {fullyPaid && <div className="notice ok" style={{ marginTop: "0.75rem", marginBottom: 0 }}>Paid in full ✓</div>}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Line items</h2>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th className="right">Qty</th>
              <th className="right">Unit</th>
              <th className="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => (
              <tr key={l.id}>
                <td>{l.description}</td>
                <td className="right num">{l.quantity}</td>
                <td className="right num">{formatMoney(l.unitPriceCents, order.currency)}</td>
                <td className="right num">{formatMoney(l.lineTotalCents, order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Payments</h2>
          {order.payments.length === 0 ? (
            <p className="muted">No payments recorded.</p>
          ) : (
            <table>
              <tbody>
                {order.payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <StatusBadge status={p.status === "succeeded" ? "paid" : "pending"} />{" "}
                      <span className="small muted">{p.provider}{p.method ? ` · ${p.method}` : ""}</span>
                    </td>
                    <td className="right num">{formatMoney(p.amountCents, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form action={manualPaymentAction} style={{ marginTop: "1rem" }}>
            <input type="hidden" name="id" value={order.id} />
            <label className="small">Record a manual payment (cash, check, etc.)</label>
            <div className="actions">
              <input name="amount" inputMode="decimal" placeholder="0.00" style={{ maxWidth: 120 }} />
              <input name="method" placeholder="cash" style={{ maxWidth: 120 }} />
              <button type="submit" className="btn secondary btn-sm">Record</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Send &amp; collect</h2>
          <div className="stack">
            <div className="actions">
              {providers.length === 0 && (
                <span className="small muted">No payment provider configured (see README).</span>
              )}
              {providers.map((p) => (
                <form key={p.id} action={paymentLinkAction}>
                  <input type="hidden" name="id" value={order.id} />
                  <input type="hidden" name="provider" value={p.id} />
                  <button type="submit" className="btn btn-sm" disabled={order.totalCents <= 0}>
                    {p.id === "stripe" ? "Stripe" : "Square"} payment link
                  </button>
                </form>
              ))}
            </div>

            <form action={emailInvoiceAction}>
              <input type="hidden" name="id" value={order.id} />
              <button
                type="submit"
                className="btn secondary btn-sm"
                disabled={!emailConfig.isConfigured || !order.contact?.email}
              >
                Email invoice
              </button>
              {!emailConfig.isConfigured && (
                <span className="small muted"> — set RESEND_API_KEY to enable</span>
              )}
            </form>

            <form action={requestSignatureAction}>
              <input type="hidden" name="id" value={order.id} />
              <label className="small">Request e-signature (DocuSeal)</label>
              <div className="actions">
                <input
                  name="signerEmail"
                  type="email"
                  placeholder={order.contact?.email || "signer@email.com"}
                  style={{ maxWidth: 200 }}
                />
                <button type="submit" className="btn secondary btn-sm" disabled={!docusealConfig.isConfigured}>
                  Send
                </button>
              </div>
              {!docusealConfig.isConfigured && (
                <span className="small muted">Set DOCUSEAL_API_KEY + DOCUSEAL_TEMPLATE_ID to enable</span>
              )}
            </form>
          </div>
        </div>
      </div>

      {order.documents.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Documents</h2>
          <table>
            <tbody>
              {order.documents.map((d) => (
                <tr key={d.id}>
                  <td>
                    <StatusBadge status={d.status} /> <span className="small muted">{d.signerEmail}</span>
                  </td>
                  <td className="right">
                    {d.signedPdfPath ? (
                      <a href={`/api/uploads/${d.signedPdfPath}`} target="_blank">Signed PDF</a>
                    ) : (
                      <span className="small muted">awaiting signature</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {order.notes && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Notes</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{order.notes}</p>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>History</h2>
        <table>
          <tbody>
            {order.history.map((h) => (
              <tr key={h.id}>
                <td><StatusBadge status={h.status} /></td>
                <td>{h.note}</td>
                <td className="small muted">{h.userName}</td>
                <td className="small muted right">
                  {new Date(h.createdAt).toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontWeight: strong ? 700 : 400,
      }}
    >
      <span className={strong ? "" : "muted"}>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
