"use client";

import { useState } from "react";
import type { Contact } from "@/lib/db/schema";

type Addr = { address: string; city: string; state: string; zip: string };

export function ContactForm({
  action,
  contact,
}: {
  action: (formData: FormData) => Promise<void>;
  contact?: Contact;
}) {
  const initShipping: Addr = {
    address: contact?.shippingAddress ?? "",
    city: contact?.shippingCity ?? "",
    state: contact?.shippingState ?? "",
    zip: contact?.shippingZip ?? "",
  };
  const initBilling: Addr = {
    address: contact?.billingAddress ?? "",
    city: contact?.billingCity ?? "",
    state: contact?.billingState ?? "",
    zip: contact?.billingZip ?? "",
  };
  const billingEmpty =
    !initBilling.address && !initBilling.city && !initBilling.state && !initBilling.zip;
  const billingMatchesShipping =
    initBilling.address === initShipping.address &&
    initBilling.city === initShipping.city &&
    initBilling.state === initShipping.state &&
    initBilling.zip === initShipping.zip;

  const [shipping, setShipping] = useState<Addr>(initShipping);
  const [billing, setBilling] = useState<Addr>(initBilling);
  // Billing defaults to matching the shipping address.
  const [same, setSame] = useState(!contact || billingEmpty || billingMatchesShipping);

  const setS = (patch: Partial<Addr>) => setShipping((s) => ({ ...s, ...patch }));
  const setB = (patch: Partial<Addr>) => setBilling((b) => ({ ...b, ...patch }));

  return (
    <form action={action} className="card">
      {contact && <input type="hidden" name="id" value={contact.id} />}

      <div className="grid2">
        <div className="field">
          <label htmlFor="companyName">Company name *</label>
          <input id="companyName" name="companyName" required defaultValue={contact?.companyName ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="contactName">Contact name</label>
          <input id="contactName" name="contactName" defaultValue={contact?.contactName ?? ""} />
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={contact?.email ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" defaultValue={contact?.phone ?? ""} />
        </div>
      </div>

      <h2>Shipping address</h2>
      <div className="field">
        <label htmlFor="shippingAddress">Street</label>
        <input id="shippingAddress" name="shippingAddress" value={shipping.address} onChange={(e) => setS({ address: e.target.value })} />
      </div>
      <div className="grid3">
        <div className="field">
          <label htmlFor="shippingCity">City</label>
          <input id="shippingCity" name="shippingCity" value={shipping.city} onChange={(e) => setS({ city: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="shippingState">State</label>
          <input id="shippingState" name="shippingState" value={shipping.state} onChange={(e) => setS({ state: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="shippingZip">ZIP</label>
          <input id="shippingZip" name="shippingZip" value={shipping.zip} onChange={(e) => setS({ zip: e.target.value })} />
        </div>
      </div>

      <h2>Billing address</h2>
      <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 400, marginBottom: "0.75rem" }}>
        <input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} style={{ width: "auto" }} />
        Same as shipping address
      </label>

      {same ? (
        <>
          <input type="hidden" name="billingAddress" value={shipping.address} />
          <input type="hidden" name="billingCity" value={shipping.city} />
          <input type="hidden" name="billingState" value={shipping.state} />
          <input type="hidden" name="billingZip" value={shipping.zip} />
          <p className="small muted" style={{ marginTop: 0 }}>Billing matches the shipping address.</p>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="billingAddress">Street</label>
            <input id="billingAddress" name="billingAddress" value={billing.address} onChange={(e) => setB({ address: e.target.value })} />
          </div>
          <div className="grid3">
            <div className="field">
              <label htmlFor="billingCity">City</label>
              <input id="billingCity" name="billingCity" value={billing.city} onChange={(e) => setB({ city: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="billingState">State</label>
              <input id="billingState" name="billingState" value={billing.state} onChange={(e) => setB({ state: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="billingZip">ZIP</label>
              <input id="billingZip" name="billingZip" value={billing.zip} onChange={(e) => setB({ zip: e.target.value })} />
            </div>
          </div>
        </>
      )}

      <div className="field" style={{ marginTop: "1rem" }}>
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={contact?.notes ?? ""} />
      </div>

      <div className="actions">
        <button type="submit" className="btn">Save contact</button>
        <a href="/contacts" className="btn secondary">Cancel</a>
      </div>
    </form>
  );
}
