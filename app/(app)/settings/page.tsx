import { getSettings } from "@/lib/services/settings";
import {
  stripe as stripeConfig,
  square as squareConfig,
  docuseal as docusealConfig,
  email as emailConfig,
  ups as upsConfig,
} from "@/lib/config";
import { updateSettingsAction } from "./actions";

function domainLabel(url: string): string {
  try {
    return new URL(url).hostname.split(".").slice(-2).join(".");
  } catch {
    return url;
  }
}

function IntegrationRow({
  name,
  purpose,
  ok,
  link,
}: {
  name: string;
  purpose: string;
  ok: boolean;
  link: string;
}) {
  return (
    <tr>
      <td><strong>{name}</strong></td>
      <td className="small muted">{purpose}</td>
      <td>
        <span className={`badge ${ok ? "completed" : "pending"}`}>
          {ok ? "Configured" : "Not configured"}
        </span>
      </td>
      <td>
        <a href={link} target="_blank" rel="noopener noreferrer">
          {domainLabel(link)}
        </a>
      </td>
    </tr>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const { msg } = await searchParams;
  const s = await getSettings();

  return (
    <>
      <h1>Settings</h1>
      {msg && <div className="notice ok">{msg}</div>}

      <form action={updateSettingsAction} className="card">
        <h2 style={{ marginTop: 0 }}>Business details (shown on invoices)</h2>
        <div className="field">
          <label htmlFor="businessName">Business name</label>
          <input id="businessName" name="businessName" defaultValue={s.businessName} />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="businessEmail">Email</label>
            <input id="businessEmail" name="businessEmail" defaultValue={s.businessEmail} />
          </div>
          <div className="field">
            <label htmlFor="businessPhone">Phone</label>
            <input id="businessPhone" name="businessPhone" defaultValue={s.businessPhone} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="businessAddress">Address</label>
          <input id="businessAddress" name="businessAddress" defaultValue={s.businessAddress} />
        </div>
        <div className="field">
          <label htmlFor="invoiceFooter">Invoice footer</label>
          <input id="invoiceFooter" name="invoiceFooter" defaultValue={s.invoiceFooter} />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="brandColor">Brand color</label>
            <input id="brandColor" name="brandColor" type="color" defaultValue={s.brandColor} style={{ height: 40 }} />
          </div>
          <div className="field">
            <label htmlFor="defaultCurrency">Default currency</label>
            <input id="defaultCurrency" name="defaultCurrency" defaultValue={s.defaultCurrency} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="processingFeePercent">
            Card processing fee % (passed to customers when enabled on an order; 0 = off)
          </label>
          <input
            id="processingFeePercent"
            name="processingFeePercent"
            inputMode="decimal"
            defaultValue={String(s.processingFeePercent)}
            placeholder="3.4"
            style={{ maxWidth: 160 }}
          />
        </div>
        <div className="field">
          <label htmlFor="wholesaleDiscountPercent">
            Default wholesale discount % (portal customers pay this much off retail
            unless they have their own rate or an item has a set wholesale price)
          </label>
          <input
            id="wholesaleDiscountPercent"
            name="wholesaleDiscountPercent"
            inputMode="decimal"
            defaultValue={String(s.wholesaleDiscountPercent)}
            placeholder="40"
            style={{ maxWidth: 160 }}
          />
        </div>
        <button type="submit" className="btn">Save settings</button>
      </form>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Integrations</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>Status</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            <IntegrationRow name="Resend (email)" purpose="Email invoices to customers" ok={emailConfig.isConfigured} link="https://resend.com/docs" />
            <IntegrationRow name="Stripe" purpose="Card payments via payment link" ok={stripeConfig.isConfigured} link="https://docs.stripe.com/keys" />
            <IntegrationRow name="Square" purpose="Payments + catalog import" ok={squareConfig.isConfigured} link="https://developer.squareup.com/apps" />
            <IntegrationRow name="DocuSeal" purpose="E-signatures on orders" ok={docusealConfig.isConfigured} link="https://docs.docuseal.com" />
            <IntegrationRow name="UPS (tracking)" purpose="Auto-mark shipped + tracking" ok={upsConfig.isConfigured} link="https://developer.ups.com" />
          </tbody>
        </table>
      </div>
    </>
  );
}
