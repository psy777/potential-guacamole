import { requireContact } from "@/lib/auth/wholesale";
import { updateProfileAction } from "../actions";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const c = await requireContact();
  const { saved } = await searchParams;

  return (
    <>
      <div className="portal-hero">
        <h1>Your profile</h1>
        <p>Keep your company and shipping details up to date.</p>
      </div>

      {saved && <div className="notice ok">Your profile has been saved.</div>}

      <form action={updateProfileAction} className="card">
        <div className="grid2">
          <div className="field">
            <label htmlFor="companyName">Company name</label>
            <input id="companyName" name="companyName" defaultValue={c.companyName} required />
          </div>
          <div className="field">
            <label htmlFor="contactName">Your name</label>
            <input id="contactName" name="contactName" defaultValue={c.contactName} />
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="email">Email (sign-in — contact us to change)</label>
            <input id="email" type="email" value={c.email} readOnly disabled />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" defaultValue={c.phone} />
          </div>
        </div>

        <h2>Shipping address</h2>
        <div className="field">
          <label htmlFor="shippingAddress">Street</label>
          <input id="shippingAddress" name="shippingAddress" defaultValue={c.shippingAddress} />
        </div>
        <div className="grid3">
          <div className="field">
            <label htmlFor="shippingCity">City</label>
            <input id="shippingCity" name="shippingCity" defaultValue={c.shippingCity} />
          </div>
          <div className="field">
            <label htmlFor="shippingState">State</label>
            <input id="shippingState" name="shippingState" defaultValue={c.shippingState} />
          </div>
          <div className="field">
            <label htmlFor="shippingZip">ZIP</label>
            <input id="shippingZip" name="shippingZip" defaultValue={c.shippingZip} />
          </div>
        </div>

        <h2>Billing address</h2>
        <div className="field">
          <label htmlFor="billingAddress">Street</label>
          <input id="billingAddress" name="billingAddress" defaultValue={c.billingAddress} />
        </div>
        <div className="grid3">
          <div className="field">
            <label htmlFor="billingCity">City</label>
            <input id="billingCity" name="billingCity" defaultValue={c.billingCity} />
          </div>
          <div className="field">
            <label htmlFor="billingState">State</label>
            <input id="billingState" name="billingState" defaultValue={c.billingState} />
          </div>
          <div className="field">
            <label htmlFor="billingZip">ZIP</label>
            <input id="billingZip" name="billingZip" defaultValue={c.billingZip} />
          </div>
        </div>

        <div className="actions" style={{ marginTop: "1rem" }}>
          <button type="submit" className="btn">Save profile</button>
        </div>
      </form>
    </>
  );
}
