import Link from "next/link";
import { notFound } from "next/navigation";
import { getContact } from "@/lib/services/contacts";
import { getSettings } from "@/lib/services/settings";
import { listContactOrders } from "@/lib/services/wholesale";
import { APP_URL } from "@/lib/config";
import { InlineAction } from "@/components/ui";
import { CopyableLink } from "@/components/copyable-link";
import { formatMoney } from "@/lib/money";
import {
  deleteContactAction,
  setPortalAccessAction,
  setPortalPasswordAction,
  setContactDiscountAction,
  sendPortalInviteAction,
} from "../actions";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d);

function cityLine(city: string, state: string, zip: string) {
  const cs = [city, state].filter(Boolean).join(", ");
  return [cs, zip].filter(Boolean).join(" ");
}

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; err?: string }>;
}) {
  const { id } = await params;
  const { msg, err } = await searchParams;
  const contact = await getContact(id);
  if (!contact) notFound();
  const [settings, orders] = await Promise.all([getSettings(), listContactOrders(id)]);

  const hasPassword = Boolean(contact.passwordHash);
  const invitePending = Boolean(
    contact.portalInviteToken &&
      contact.portalInviteExpiresAt &&
      contact.portalInviteExpiresAt > new Date()
  );
  const activationUrl = contact.portalInviteToken
    ? `${APP_URL}/portal/activate?token=${contact.portalInviteToken}`
    : null;
  const active = contact.portalEnabled && hasPassword;
  const statusLabel = active ? "Active" : invitePending ? "Invited" : "Not set up";
  const statusClass = active ? "paid" : invitePending ? "invoiced" : "draft";

  const shipCity = cityLine(contact.shippingCity, contact.shippingState, contact.shippingZip);
  const billCity = cityLine(contact.billingCity, contact.billingState, contact.billingZip);

  return (
    <>
      <div className="header-row">
        <h1>{contact.companyName}</h1>
        <div className="actions">
          <Link href={`/contacts/${contact.id}/edit`} className="btn secondary btn-sm">
            Edit
          </Link>
          <InlineAction
            action={deleteContactAction}
            id={contact.id}
            label="Delete"
            className="btn danger btn-sm"
            confirmMessage={`Delete ${contact.companyName}? This can't be undone.`}
          />
        </div>
      </div>

      {msg && <div className="notice ok">{msg}</div>}
      {err && <div className="notice error">{err}</div>}

      {/* Contact info (read-only) */}
      <div className="card">
        <div className="grid3">
          <div>
            <div className="cat-cat">Contact</div>
            <div>{contact.contactName || "—"}</div>
          </div>
          <div>
            <div className="cat-cat">Email</div>
            <div>{contact.email || "—"}</div>
          </div>
          <div>
            <div className="cat-cat">Phone</div>
            <div>{contact.phone || "—"}</div>
          </div>
        </div>
        <div className="grid2" style={{ marginTop: "1rem" }}>
          <div>
            <div className="cat-cat">Shipping address</div>
            {contact.shippingAddress || shipCity ? (
              <div>
                {contact.shippingAddress && <div>{contact.shippingAddress}</div>}
                {shipCity && <div>{shipCity}</div>}
              </div>
            ) : (
              <div className="muted">—</div>
            )}
          </div>
          <div>
            <div className="cat-cat">Billing address</div>
            {contact.billingAddress || billCity ? (
              <div>
                {contact.billingAddress && <div>{contact.billingAddress}</div>}
                {billCity && <div>{billCity}</div>}
              </div>
            ) : (
              <div className="muted">—</div>
            )}
          </div>
        </div>
        {contact.notes && (
          <div style={{ marginTop: "1rem" }}>
            <div className="cat-cat">Notes</div>
            <div>{contact.notes}</div>
          </div>
        )}
      </div>

      {/* Wholesale portal access management */}
      <div className="card" style={{ marginTop: "1.25rem" }}>
        <div className="header-row">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Wholesale portal access</h2>
          <span className={`badge ${statusClass}`}>{statusLabel}</span>
        </div>
        <p className="muted small">
          Invite this customer to sign in at the wholesale portal, see their prices,
          and place self-serve orders. They&apos;ll sign in with{" "}
          <strong>{contact.email || "(no email set)"}</strong>.
        </p>

        <div style={{ margin: "0.75rem 0 1rem" }}>
          <form action={sendPortalInviteAction}>
            <input type="hidden" name="id" value={contact.id} />
            <button type="submit" className="btn btn-sm" disabled={!contact.email}>
              {active || invitePending ? "Resend invitation" : "Send portal invitation"}
            </button>
            {!contact.email && (
              <span className="muted small" style={{ marginLeft: "0.5rem" }}>
                Add an email address first.
              </span>
            )}
          </form>

          {invitePending && activationUrl && (
            <div style={{ marginTop: "0.6rem" }}>
              <p className="muted small" style={{ margin: 0 }}>
                Invitation pending — the customer hasn&apos;t activated yet. If the
                email didn&apos;t arrive, send them this activation link:
              </p>
              <CopyableLink url={activationUrl} />
            </div>
          )}
        </div>

        <div className="grid2" style={{ marginTop: "0.5rem" }}>
          <form action={setPortalAccessAction} className="stack">
            <label className="fee-toggle">
              <input type="checkbox" name="enabled" defaultChecked={contact.portalEnabled} />
              Portal access enabled
            </label>
            <input type="hidden" name="id" value={contact.id} />
            <button type="submit" className="btn btn-sm secondary">Save access</button>
          </form>

          <form action={setPortalPasswordAction} className="stack">
            <div className="field">
              <label htmlFor="pw">
                {hasPassword ? "Reset password manually" : "Or set a password manually"}
              </label>
              <input id="pw" name="password" type="text" minLength={8} placeholder="At least 8 characters" required />
            </div>
            <input type="hidden" name="id" value={contact.id} />
            <button type="submit" className="btn btn-sm secondary">
              {hasPassword ? "Update password" : "Set password & enable"}
            </button>
          </form>
        </div>

        <form action={setContactDiscountAction} className="stack" style={{ marginTop: "1rem", maxWidth: "360px" }}>
          <div className="field">
            <label htmlFor="disc">Wholesale discount override (%)</label>
            <input
              id="disc"
              name="discountPercent"
              type="number"
              min={0}
              max={100}
              step="0.1"
              defaultValue={contact.wholesaleDiscountPercent ?? ""}
              placeholder={`Default: ${settings.wholesaleDiscountPercent}%`}
            />
            <span className="muted small">
              Leave blank to use the global default ({settings.wholesaleDiscountPercent}%).
              A per-item wholesale price still overrides this.
            </span>
          </div>
          <input type="hidden" name="id" value={contact.id} />
          <button type="submit" className="btn btn-sm secondary">Save discount</button>
        </form>
      </div>

      {/* Order history */}
      <div className="header-row" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Orders</h2>
      </div>
      <div className="card">
        {orders.length === 0 ? (
          <p className="muted">No orders yet.</p>
        ) : (
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
                    <Link href={`/orders/${o.id}`}>{o.number}</Link>
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
        )}
      </div>
    </>
  );
}
