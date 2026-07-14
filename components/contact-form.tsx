import type { Contact } from "@/lib/db/schema";

export function ContactForm({
  action,
  contact,
}: {
  action: (formData: FormData) => Promise<void>;
  contact?: Contact;
}) {
  const v = (k: keyof Contact) => (contact?.[k] as string) ?? "";
  return (
    <form action={action} className="card">
      {contact && <input type="hidden" name="id" value={contact.id} />}

      <div className="grid2">
        <div className="field">
          <label htmlFor="companyName">Company name *</label>
          <input id="companyName" name="companyName" required defaultValue={v("companyName")} />
        </div>
        <div className="field">
          <label htmlFor="contactName">Contact name</label>
          <input id="contactName" name="contactName" defaultValue={v("contactName")} />
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={v("email")} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" defaultValue={v("phone")} />
        </div>
      </div>

      <h2>Billing address</h2>
      <div className="field">
        <label htmlFor="billingAddress">Street</label>
        <input id="billingAddress" name="billingAddress" defaultValue={v("billingAddress")} />
      </div>
      <div className="grid3">
        <div className="field">
          <label htmlFor="billingCity">City</label>
          <input id="billingCity" name="billingCity" defaultValue={v("billingCity")} />
        </div>
        <div className="field">
          <label htmlFor="billingState">State</label>
          <input id="billingState" name="billingState" defaultValue={v("billingState")} />
        </div>
        <div className="field">
          <label htmlFor="billingZip">ZIP</label>
          <input id="billingZip" name="billingZip" defaultValue={v("billingZip")} />
        </div>
      </div>

      <h2>Shipping address</h2>
      <div className="field">
        <label htmlFor="shippingAddress">Street</label>
        <input id="shippingAddress" name="shippingAddress" defaultValue={v("shippingAddress")} />
      </div>
      <div className="grid3">
        <div className="field">
          <label htmlFor="shippingCity">City</label>
          <input id="shippingCity" name="shippingCity" defaultValue={v("shippingCity")} />
        </div>
        <div className="field">
          <label htmlFor="shippingState">State</label>
          <input id="shippingState" name="shippingState" defaultValue={v("shippingState")} />
        </div>
        <div className="field">
          <label htmlFor="shippingZip">ZIP</label>
          <input id="shippingZip" name="shippingZip" defaultValue={v("shippingZip")} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={v("notes")} />
      </div>

      <div className="actions">
        <button type="submit" className="btn">Save contact</button>
        <a href="/contacts" className="btn secondary">Cancel</a>
      </div>
    </form>
  );
}
