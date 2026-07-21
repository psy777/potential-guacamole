import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/services/orders";
import { getSettings } from "@/lib/services/settings";
import { enabledProviders } from "@/lib/services/payments";
import { formatMoney } from "@/lib/money";
import { StatusBadge, InlineAction } from "@/components/ui";
import { CopyPaymentLink } from "@/components/copy-payment-link";
import { EmailComposer } from "@/components/email-composer";
import { Toast } from "@/components/toast";
import { docuseal as docusealConfig, email as emailConfig, ups as upsConfig } from "@/lib/config";
import {
  setStatusAction,
  setTrackingAction,
  syncTrackingAction,
  manualPaymentAction,
  emailInvoiceAction,
  requestSignatureAction,
  deleteOrderAction,
} from "../actions";

const NEXT_STATUS: Record<string, { label: string; status: string }[]> = {
  open: [
    { label: "Mark shipped", status: "shipped" },
    { label: "Cancel", status: "cancelled" },
  ],
  shipped: [
    { label: "Mark invoiced", status: "invoiced" },
    { label: "Cancel", status: "cancelled" },
  ],
  invoiced: [{ label: "Mark paid", status: "paid" }],
  paid: [],
  cancelled: [{ label: "Reopen", status: "open" }],
};

const ALL_STATUSES = ["open", "shipped", "invoiced", "paid", "cancelled"] as const;
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; err?: string }>;
}) {
  const { id } = await params;
  const { msg, err } = await searchParams;
  const order = await getOrder(id);
  if (!order) notFound();

  const settings = await getSettings();
  const providers = enabledProviders();
  const fullyPaid =
    order.totalCents > 0 && order.amountPaidCents >= order.totalCents;
  const balanceCents = Math.max(0, order.totalCents - order.amountPaidCents);
  const displayTitle = order.title || `${order.contact?.companyName ?? "Unnamed"}'s Order`;
  const invoiceLabel = order.invoiceId || order.number.replace(/^ORD-/, "");
  const transitions = NEXT_STATUS[order.status] ?? [];
  const nextStatus =
    transitions.find((t) => t.status !== "cancelled")?.status ?? order.status;
  const greeting = order.contact?.contactName || order.contact?.companyName || "there";
  const defaultEmailBody = order.invoiceMessage
    ? `<p>Hi ${greeting},</p><p>${order.invoiceMessage}</p><p>Please find invoice ${order.number} attached.</p>`
    : `<p>Hi ${greeting},</p><p>Please find invoice ${order.number} attached. Let me know if you have any questions.</p><p>Thank you,<br/>${settings.businessName}</p>`;

  return (
    <>
      <Toast message={msg} type="ok" />
      <Toast message={err} type="error" />

      <div className="header-row">
        <div>
          <h1 style={{ marginBottom: "0.15rem" }}>{displayTitle}</h1>
          <span className="small muted">Invoice #{invoiceLabel}</span>
        </div>
        <div className="actions">
          <a href={`/api/orders/${order.id}/invoice`} className="btn secondary btn-sm" target="_blank">
            Download invoice
          </a>
          <Link href={`/orders/${order.id}/packing`} className="btn secondary btn-sm">
            Packing list
          </Link>
          <Link href={`/orders/${order.id}/edit`} className="btn secondary btn-sm">
            Edit
          </Link>
          <InlineAction action={deleteOrderAction} id={order.id} label="Delete" className="btn danger btn-sm" />
        </div>
      </div>

      {order.dueDate && (
        <p className="small" style={{ marginTop: "-0.75rem", marginBottom: "1rem" }}>
          <span className="muted">Due </span>
          <span
            className={
              order.dueDate < new Date() && order.status === "open" ? "due-overdue" : ""
            }
          >
            {new Date(order.dueDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </p>
      )}

      <div className="card" style={{ padding: "0.9rem 1.1rem" }}>
        <div className="status-bar">
          <div className="status-left">
            <span className="small muted" style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>Status</span>
            <StatusBadge status={order.status} />
          </div>
          <form action={setStatusAction} className="status-right">
            <input type="hidden" name="id" value={order.id} />
            <label className="small muted" style={{ margin: 0 }}>Set</label>
            <select name="status" defaultValue={nextStatus} style={{ width: "auto" }}>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </select>
            <button type="submit" className="btn secondary btn-sm">Update</button>
          </form>
        </div>
      </div>

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
            {order.processingFeeCents > 0 && <Row label="Card processing fee" value={formatMoney(order.processingFeeCents, order.currency)} />}
            <Row label="Total" value={formatMoney(order.totalCents, order.currency)} strong />
            <Row label="Paid" value={formatMoney(order.amountPaidCents, order.currency)} />
            <Row label="Balance" value={formatMoney(balanceCents, order.currency)} strong />
            {order.squareProcessingFeeCents != null && (
              <div className="small muted" style={{ marginTop: "0.3rem" }}>
                Square&apos;s actual fee on payment:{" "}
                {formatMoney(order.squareProcessingFeeCents, order.currency)}
              </div>
            )}
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
                <td>
                  {l.description}
                  {l.variationName && <div className="small muted">{l.variationName}</div>}
                  {l.note && <div className="small muted" style={{ fontStyle: "italic" }}>{l.note}</div>}
                </td>
                <td className="right num">{l.quantity}</td>
                <td className="right num">{formatMoney(l.unitPriceCents, order.currency)}</td>
                <td className="right num">{formatMoney(l.lineTotalCents, order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Shipping</h2>
        <div className="grid2">
          <div>
            <label className="small muted" style={{ display: "block", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: ".05em" }}>Ship to</label>
            {order.contact && (order.contact.shippingAddress || order.contact.shippingCity) ? (
              <div className="small">
                <div>{order.contact.shippingAddress}</div>
                <div className="muted">
                  {[order.contact.shippingCity, order.contact.shippingState, order.contact.shippingZip].filter(Boolean).join(", ")}
                </div>
              </div>
            ) : (
              <div className="small muted">—</div>
            )}
          </div>
          <div>
            <label className="small muted" style={{ display: "block", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: ".05em" }}>UPS tracking</label>
            <form action={setTrackingAction} className="actions" style={{ gap: "0.4rem" }}>
              <input type="hidden" name="id" value={order.id} />
              <input name="tracking" defaultValue={order.trackingNumber} placeholder="1Z…" style={{ maxWidth: 200 }} />
              <button type="submit" className="btn ghost btn-sm">Save</button>
            </form>
            {order.trackingNumber && (
              <a
                href={`https://www.ups.com/track?tracknum=${encodeURIComponent(order.trackingNumber)}`}
                target="_blank"
                className="small"
                style={{ display: "inline-block", marginTop: "0.4rem" }}
              >
                Track on UPS ↗
              </a>
            )}
            {order.trackingStatus && (
              <div className="small muted" style={{ marginTop: "0.35rem" }}>UPS: {order.trackingStatus}</div>
            )}
            {upsConfig.isConfigured && order.trackingNumber && (
              <form action={syncTrackingAction} style={{ marginTop: "0.35rem" }}>
                <input type="hidden" name="id" value={order.id} />
                <button type="submit" className="btn ghost btn-sm">Sync from UPS</button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <h2 style={{ margin: 0 }}>Payments</h2>
            {balanceCents > 0 && providers.length > 0 && <CopyPaymentLink orderId={order.id} />}
          </div>
          {order.payments.length === 0 ? (
            <p className="muted" style={{ marginTop: "0.9rem" }}>No payments recorded.</p>
          ) : (
            <table style={{ marginTop: "0.9rem" }}>
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

          <div style={{ marginTop: "1rem", paddingTop: "0.9rem", borderTop: "1px solid var(--border)" }}>
            {balanceCents > 0 ? (
              <div className="small">
                Balance due{" "}
                <strong className="num">{formatMoney(balanceCents, order.currency)}</strong>
                {providers.length === 0 && (
                  <span className="muted"> · Configure Square or Stripe to collect online (see README).</span>
                )}
              </div>
            ) : (
              <div className="notice ok" style={{ margin: 0 }}>Paid in full ✓</div>
            )}
          </div>

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
          <h2 style={{ marginTop: 0 }}>Send invoice</h2>
          <div className="stack">
            <div>
              <EmailComposer
                action={emailInvoiceAction}
                orderId={order.id}
                disabled={!emailConfig.isConfigured || !order.contact?.email}
                emailConfigured={emailConfig.isConfigured}
                toEmail={order.contact?.email || ""}
                defaultSubject={`Invoice ${order.number} from ${settings.businessName}`}
                defaultBody={defaultEmailBody}
                clientName={order.contact?.contactName || order.contact?.companyName || ""}
                businessName={order.contact?.companyName || ""}
                orderNumber={order.number}
              />
              <p className="small muted" style={{ marginTop: "0.4rem", marginBottom: 0 }}>
                Attaches the invoice PDF and includes a &ldquo;Pay online&rdquo; button for the balance due.
              </p>
            </div>

            {docusealConfig.isConfigured && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.9rem" }}>
                <form action={requestSignatureAction}>
                  <input type="hidden" name="id" value={order.id} />
                  <label className="small" style={{ marginBottom: "0.35rem" }}>
                    Request e-signature (DocuSeal)
                  </label>
                  <div className="actions">
                    <input
                      name="signerEmail"
                      type="email"
                      placeholder={order.contact?.email || "signer@email.com"}
                      style={{ maxWidth: 200 }}
                    />
                    <button type="submit" className="btn secondary btn-sm">Send</button>
                  </div>
                </form>
              </div>
            )}
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

      {(order.invoiceMessage || order.notes) && (
        <div className="card">
          {order.invoiceMessage && (
            <>
              <h2 style={{ marginTop: 0 }}>Message on invoice</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{order.invoiceMessage}</p>
            </>
          )}
          {order.notes && (
            <>
              <h2 style={order.invoiceMessage ? {} : { marginTop: 0 }}>Internal notes</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{order.notes}</p>
            </>
          )}
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
