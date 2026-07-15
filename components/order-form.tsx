"use client";

import { useMemo, useState } from "react";
import { dollarsToCents, formatMoney, centsToDecimal } from "@/lib/money";
import type { FullOrder } from "@/lib/services/orders";

type ContactOption = { id: string; companyName: string };
type CatalogOption = {
  value: string;
  kind: "item" | "package";
  id: string;
  variationId?: string;
  name: string;
  priceCents: number;
};
type Line = {
  itemId: string | null;
  packageId: string | null;
  catalogValue?: string; // ties a line back to a catalog option for merging
  description: string;
  quantity: number;
  unitPrice: string; // dollars, as typed
};

const isoDate = (d: Date) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate()
  ).padStart(2, "0")}`;
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
  const [discount, setDiscount] = useState(order ? centsToDecimal(order.discountCents) : "0");
  const [tax, setTax] = useState(order ? centsToDecimal(order.taxCents) : "0");
  const [shipping, setShipping] = useState(order ? centsToDecimal(order.shippingCents) : "0");

  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, catalog]);

  const subtotalCents = lines.reduce(
    (sum, l) => sum + dollarsToCents(l.unitPrice) * l.quantity,
    0
  );
  const totalCents = Math.max(
    0,
    subtotalCents - dollarsToCents(discount) + dollarsToCents(tax) + dollarsToCents(shipping)
  );

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const addFromCatalog = (opt: CatalogOption) => {
    setLines((ls) => {
      const existing = ls.findIndex((l) => l.catalogValue === opt.value);
      if (existing >= 0) {
        return ls.map((l, i) =>
          i === existing ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...ls,
        {
          itemId: opt.kind === "item" ? opt.id : null,
          packageId: opt.kind === "package" ? opt.id : null,
          catalogValue: opt.value,
          description: opt.name,
          quantity: 1,
          unitPrice: centsToDecimal(opt.priceCents),
        },
      ];
    });
    setQuery("");
    setActiveIdx(0);
  };

  const addCustomLine = () =>
    setLines((ls) => [
      ...ls,
      { itemId: null, packageId: null, description: "", quantity: 1, unitPrice: "0" },
    ]);

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (!matches.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      addFromCatalog(matches[activeIdx] ?? matches[0]);
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  return (
    <form action={action} className="card">
      {order && <input type="hidden" name="id" value={order.id} />}
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      <div className="grid3">
        <div className="field">
          <label htmlFor="contactId">Customer</label>
          <select id="contactId" name="contactId" defaultValue={order?.contactId ?? ""}>
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="dueDate">Due date</label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={order?.dueDate ? isoDate(order.dueDate) : ""}
          />
        </div>
        <div className="field">
          <label htmlFor="currency">Currency</label>
          <input id="currency" name="currency" defaultValue={order?.currency ?? "USD"} />
        </div>
      </div>

      <h2>Line items</h2>

      {/* Search-to-add: type an item or variation, click (or Enter) to add. */}
      <div className="combo-wrap" style={{ marginBottom: "0.75rem" }}>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(0);
          }}
          onKeyDown={onSearchKey}
          placeholder="🔍 Search items to add…"
          autoComplete="off"
        />
        {matches.length > 0 && (
          <div className="combo-results">
            {matches.map((m, i) => (
              <div
                key={m.value}
                className={`combo-item ${i === activeIdx ? "active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addFromCatalog(m);
                }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span>{m.kind === "package" ? "📦 " : ""}{m.name}</span>
                <span className="price">{formatMoney(m.priceCents)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: "46%" }}>Description</th>
            <th className="right">Qty</th>
            <th className="right">Unit price</th>
            <th className="right">Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr>
              <td colSpan={5} className="muted small" style={{ padding: "1rem", textAlign: "center" }}>
                Search above to add items, or add a custom line.
              </td>
            </tr>
          )}
          {lines.map((l, i) => (
            <tr key={i}>
              <td>
                <input
                  value={l.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                  placeholder="Description"
                />
              </td>
              <td>
                <div className="qty-stepper">
                  <button type="button" onClick={() => updateLine(i, { quantity: Math.max(1, l.quantity - 1) })}>−</button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={l.quantity || ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      updateLine(i, { quantity: raw === "" ? 0 : Number(raw) });
                    }}
                    onBlur={() => {
                      if (l.quantity < 1) updateLine(i, { quantity: 1 });
                    }}
                  />
                  <button type="button" onClick={() => updateLine(i, { quantity: l.quantity + 1 })}>+</button>
                </div>
              </td>
              <td style={{ width: 120 }}>
                <input
                  inputMode="decimal"
                  className="right"
                  value={l.unitPrice}
                  onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                />
              </td>
              <td className="right num">{formatMoney(dollarsToCents(l.unitPrice) * l.quantity)}</td>
              <td>
                <button type="button" className="btn danger btn-sm" onClick={() => removeLine(i)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="actions" style={{ marginTop: "0.75rem" }}>
        <button type="button" className="btn secondary btn-sm" onClick={addCustomLine}>
          + Custom line
        </button>
      </div>

      <div className="grid3" style={{ marginTop: "1.5rem" }}>
        <div className="field">
          <label htmlFor="discount">Discount</label>
          <input id="discount" name="discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tax">Tax</label>
          <input id="tax" name="tax" inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="shipping">Shipping</label>
          <input id="shipping" name="shipping" inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} />
        </div>
      </div>

      <div style={{ maxWidth: 280, marginLeft: "auto", marginTop: "0.5rem" }}>
        <SummaryRow label="Subtotal" value={formatMoney(subtotalCents)} />
        {dollarsToCents(discount) > 0 && <SummaryRow label="Discount" value={`-${formatMoney(dollarsToCents(discount))}`} />}
        {dollarsToCents(tax) > 0 && <SummaryRow label="Tax" value={formatMoney(dollarsToCents(tax))} />}
        {dollarsToCents(shipping) > 0 && <SummaryRow label="Shipping" value={formatMoney(dollarsToCents(shipping))} />}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1.15rem", marginTop: "0.4rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
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
        <a href={order ? `/orders/${order.id}` : "/orders"} className="btn secondary">Cancel</a>
      </div>
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
      <span className="muted">{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
