import { notFound } from "next/navigation";
import { getContact } from "@/lib/services/contacts";
import { getSettings } from "@/lib/services/settings";
import { ContactForm } from "@/components/contact-form";
import { InlineAction } from "@/components/ui";
import {
  updateContactAction,
  deleteContactAction,
  setPortalAccessAction,
  setPortalPasswordAction,
  setContactDiscountAction,
} from "../actions";

export default async function EditContactPage({
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
  const settings = await getSettings();

  const hasPassword = Boolean(contact.passwordHash);

  return (
    <>
      <div className="header-row">
        <h1>Edit contact</h1>
        <InlineAction
          action={deleteContactAction}
          id={contact.id}
          label="Delete"
          className="btn danger btn-sm"
        />
      </div>

      {msg && <div className="notice ok">{msg}</div>}
      {err && <div className="notice error">{err}</div>}

      <ContactForm action={updateContactAction} contact={contact} />

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <div className="header-row">
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Wholesale portal access</h2>
          <span className={`badge ${contact.portalEnabled ? "paid" : "draft"}`}>
            {contact.portalEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        <p className="muted small">
          Lets this customer sign in at the wholesale portal to see their prices and
          place self-serve orders. They sign in with <strong>{contact.email || "(no email set)"}</strong>.
        </p>

        <div className="grid2" style={{ marginTop: "0.5rem" }}>
          {/* Enable / disable */}
          <form action={setPortalAccessAction} className="stack">
            <label className="fee-toggle">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={contact.portalEnabled}
              />
              Portal access enabled
            </label>
            <input type="hidden" name="id" value={contact.id} />
            <button type="submit" className="btn btn-sm secondary">
              Save access
            </button>
          </form>

          {/* Set / reset password */}
          <form action={setPortalPasswordAction} className="stack">
            <div className="field">
              <label htmlFor="pw">
                {hasPassword ? "Reset password" : "Set a password"}
              </label>
              <input id="pw" name="password" type="text" minLength={8} placeholder="At least 8 characters" required />
            </div>
            <input type="hidden" name="id" value={contact.id} />
            <button type="submit" className="btn btn-sm">
              {hasPassword ? "Update password" : "Set password & enable"}
            </button>
          </form>
        </div>

        {/* Discount override */}
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
          <button type="submit" className="btn btn-sm secondary">
            Save discount
          </button>
        </form>
      </div>
    </>
  );
}
