import { getSettings } from "@/lib/services/settings";
import {
  stripe as stripeConfig,
  square as squareConfig,
  docuseal as docusealConfig,
  email as emailConfig,
} from "@/lib/config";
import { updateSettingsAction } from "./actions";

function IntegrationRow({ name, ok, hint }: { name: string; ok: boolean; hint: string }) {
  return (
    <tr>
      <td><strong>{name}</strong></td>
      <td>
        <span className={`badge ${ok ? "completed" : "pending"}`}>
          {ok ? "Configured" : "Not configured"}
        </span>
      </td>
      <td className="small muted">{hint}</td>
    </tr>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const { msg } = await searchParams;
  const s = getSettings();

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
        <button type="submit" className="btn">Save settings</button>
      </form>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Integrations</h2>
        <p className="small muted">
          API keys live in your <code>.env</code> file, never in the app. See the README for setup.
        </p>
        <table>
          <tbody>
            <IntegrationRow name="Resend (email)" ok={emailConfig.isConfigured} hint="RESEND_API_KEY, EMAIL_FROM" />
            <IntegrationRow name="Stripe" ok={stripeConfig.isConfigured} hint="STRIPE_SECRET_KEY" />
            <IntegrationRow name="Square" ok={squareConfig.isConfigured} hint="SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID" />
            <IntegrationRow name="DocuSeal" ok={docusealConfig.isConfigured} hint="DOCUSEAL_API_KEY, DOCUSEAL_TEMPLATE_ID" />
          </tbody>
        </table>
      </div>
    </>
  );
}
