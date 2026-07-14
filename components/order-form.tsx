"use client";

import { useState } from "react";
import { dollarsToCents, formatMoney, centsToDecimal } from "@/lib/money";
import type { FullOrder } from "@/lib/services/orders";

type ContactOption = { id: string; companyName: string };
type CatalogOption = {
  kind: "item" | "package";
  id: string;
  name: string;
  priceCents: number;
};
type Line = {
  itemId: string | null;
  packageId: string | null;
  description: string;
  quantity: number;
  unitPrice: string; // dollars, as typed
};

export function OrderForm({
  action,
  contacts,
  catalog,
  order,
}: {
  action: (formData: FormData) => Promise<void>;
  contacts: ContactOption[];
  catalog: CatalogOption[];
  order?: FullOrder;
}) {
  const [lines, setLines] = useState<Line[]>(
    order?.lines.map((l) => ({
      itemId: l.itemId,
      packageId: l.packageId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: centsToDecimal(l.unitPriceCents),
    })) ?? []
  );
  const [discount, setDiscount] = useState(
    order ? centsToDecimal(order.discountCents) : "0"
  );
  const [tax, setTax] = useState(order ? centsToDecimal(order.taxCents) : "0");
  const [shipping, setShipping] = useState(
    order ? centsToDecimal(order.shippingCents) : "0"
  );
  const [addChoice, setAddChoice] = useState(catalog[0]?.id ?? "");

  const subtotalCents = lines.reduce(
    (sum, l) => sum + dollarsToCents(l.unitPrice) * l.quantity,
    0
  );
  const totalCents = Math.max(
    0,
    subtotalCents -
      dollarsToCents(discount) +
      dollarsToCents(tax) +
      dollarsToCents(shipping)
  );

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLine = (i: number) =>
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  const addBlank = () =>
    setLines((ls) => [
      ...ls,
      { itemId: null, packageId: null, description: "", quantity: 1, unitPrice: "0" },
    ]);
  const addFromCatalog = () => {
    const opt = catalog.find((c) => c.id === addChoice);
    if (!opt) return;
    setLines((ls) => [
      ...ls,
      {
        itemId: opt.kind === "item" ? opt.id : null,
        packageId: opt.kind === "package" ? opt.id : null,
        description: opt.name,
        quantity: 1,
        unitPrice: centsToDecimal(opt.priceCents),
      },
    ]);
  };

  return (
    <form action={action} className="card">
      {order && <input type="hidden" name="id" value={order.id} />}
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      <div className="grid2">
        <div className="field">
          <label htmlFor="contactId">Customer</label>
          <select id="contactId" name="contactId" defaultValue={order?.contactId ?? ""}>
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="currency">Currency</label>
          <input id="currency" name="currency" defaultValue={order?.currency ?? "USD"} />
        </div>
      </div>

      <h2>Line items</h2>
      <table>
        <thead>
          <tr>
            <th style={{ width: "50%" }}>Description</th>
            <th className="right">Qty</th>
            <th className="right">Unit price</th>
            <th className="right">Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td>
                <input
                  value={l.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                  placeholder="Description"
                />
              </td>
              <td style={{ width: 80 }}>
                <input
                  type="number"
                  min={1}
                  className="right"
                  value={l.quantity}
                  onChange={(e) => updateLine(i, { quantity: Number(e.target.value) || 1 })}
                />
              </td>
              <td style={{ width: 120 }}>
                <input
                  inputMode="decimal"
                  className="right"
                  value={l.unitPrice}
                  onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                />
              </td>
              <td className="right num">
                {formatMoney(dollarsToCents(l.unitPrice) * l.quantity)}
              </td>
              <td>
                <button type="button" className="btn danger btn-sm" onClick={() => removeLine(i)}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="actions" style={{ marginTop: "0.75rem" }}>
        <button type="button" className="btn secondary btn-sm" onClick={addBlank}>
          + Blank line
        </button>
        {catalog.length > 0 && (
          <>
            <select
              value={addChoice}
              onChange={(e) => setAddChoice(e.target.value)}
              style={{ width: "auto" }}
            >
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kind === "package" ? "📦 " : ""}
                  {c.name} ({formatMoney(c.priceCents)})
                </option>
              ))}
            </select>
            <button type="button" className="btn secondary btn-sm" onClick={addFromCatalog}>
              Add from catalog
            </button>
          </>
        )}
      </div>

      <div className="grid3" style={{ marginTop: "1rem" }}>
        <div className="field">
          <label htmlFor="discount">Discount</label>
          <input
            id="discount"
            name="discount"
            inputMode="decimal"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="tax">Tax</label>
          <input
            id="tax"
            name="tax"
            inputMode="decimal"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="shipping">Shipping</label>
          <input
            id="shipping"
            name="shipping"
            inputMode="decimal"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
          />
        </div>
      </div>

      <div style={{ maxWidth: 260, marginLeft: "auto", marginTop: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="muted">Subtotal</span>
          <span className="num">{formatMoney(subtotalCents)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1.1rem", marginTop: "0.4rem" }}>
          <span>Total</span>
          <span className="num">{formatMoney(totalCents)}</span>
        </div>
      </div>

      <div className="field" style={{ marginTop: "1rem" }}>
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={order?.notes ?? ""} />
      </div>

      <div className="actions">
        <button type="submit" className="btn">Save order</button>
        <a href={order ? `/orders/${order.id}` : "/orders"} className="btn secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}
