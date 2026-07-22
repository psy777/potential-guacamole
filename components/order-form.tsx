"use client";

import { useMemo, useState } from "react";
import { dollarsToCents, formatMoney, centsToDecimal } from "@/lib/money";
import type { FullOrder } from "@/lib/services/orders";
import type { CatalogGroup, CatalogPick } from "@/lib/services/catalog";
import type { AddOnView } from "@/lib/services/addons";

type ContactOption = { id: string; companyName: string };
type Line = {
  itemId: string | null;
  packageId: string | null;
  catalogValue?: string;
  description: string;
  variationName: string;
  note: string;
  quantity: number;
  unitPrice: string; // BASE price; add-ons add on top
  addOnIds: string[];
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
  groups,
  itemAddOns,
  order,
  processingFeePercent,
  nextInvoiceId,
}: {
  action: (formData: FormData) => Promise<void>;
  contacts: ContactOption[];
  groups: CatalogGroup[];
  itemAddOns: Record<string, AddOnView[]>;
  order?: FullOrder;
  processingFeePercent: number;
  nextInvoiceId?: string;
}) {
  const [lines, setLines] = useState<Line[]>(
    order?.lines.map((l) => {
      const addOnsTotal = l.addOns.reduce((s, a) => s + a.priceCents, 0);
      return {
        itemId: l.itemId,
        packageId: l.packageId,
        description: l.description,
        variationName: l.variationName,
        note: l.note,
        quantity: l.quantity,
        // Stored unit price includes add-ons; show the base in the field.
        unitPrice: centsToDecimal(l.unitPriceCents - addOnsTotal),
        addOnIds: l.addOns.map((a) => a.addOnId).filter((x): x is string => Boolean(x)),
      };
    }) ?? []
  );

  // Add-ons available on a line's item, and the current per-line surcharge.
  const lineAddOns = (l: Line): AddOnView[] => (l.itemId ? itemAddOns[l.itemId] ?? [] : []);
  const lineExtraCents = (l: Line): number =>
    lineAddOns(l)
      .filter((a) => l.addOnIds.includes(a.id))
      .reduce((s, a) => s + a.priceCents, 0);
  const lineUnitCents = (l: Line): number => dollarsToCents(l.unitPrice) + lineExtraCents(l);
  const [discount, setDiscount] = useState(order ? centsToDecimal(order.discountCents) : "0");
  const [tax, setTax] = useState(order ? centsToDecimal(order.taxCents) : "0");
  const [shipping, setShipping] = useState(order ? centsToDecimal(order.shippingCents) : "0");
  const [applyFee, setApplyFee] = useState(order?.applyProcessingFee ?? false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  // Prefill the invoice ID with the next number so it's visible. If the user
  // leaves it untouched on a new order, submit empty so the server assigns it
  // from the counter (keeping the sequence authoritative, never duplicated).
  const isNew = !order;
  const [invoiceId, setInvoiceId] = useState(order?.invoiceId || nextInvoiceId || "");
  const [invoiceTouched, setInvoiceTouched] = useState(false);
  const submittedInvoiceId = isNew && !invoiceTouched ? "" : invoiceId;

  // Flatten every variation into its own searchable row — type and it surfaces
  // both items and their variations, navigable entirely by keyboard.
  const allPicks = useMemo(
    () =>
      groups.flatMap((g) =>
        g.picks.map((p) => ({
          ...p,
          label: p.variationName ? `${p.itemName} · ${p.variationName}` : p.itemName,
          isPackage: g.kind === "package",
        }))
      ),
    [groups]
  );
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allPicks.filter((p) => p.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query, allPicks]);

  const subtotalCents = lines.reduce((s, l) => s + lineUnitCents(l) * l.quantity, 0);
  const preFeeCents = Math.max(
    0,
    subtotalCents - dollarsToCents(discount) + dollarsToCents(tax) + dollarsToCents(shipping)
  );
  const feeCents =
    applyFee && processingFeePercent > 0
      ? Math.round((preFeeCents * processingFeePercent) / 100)
      : 0;
  const totalCents = preFeeCents + feeCents;

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const toggleLineAddOn = (i: number, id: string) =>
    setLines((ls) =>
      ls.map((l, idx) =>
        idx === i
          ? { ...l, addOnIds: l.addOnIds.includes(id) ? l.addOnIds.filter((x) => x !== id) : [...l.addOnIds, id] }
          : l
      )
    );
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));
  const moveLine = (i: number, dir: -1 | 1) =>
    setLines((ls) => {
      const j = i + dir;
      if (j < 0 || j >= ls.length) return ls;
      const copy = [...ls];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const addPick = (pick: CatalogPick) => {
    setLines((ls) => {
      const existing = ls.findIndex((l) => l.catalogValue === pick.value);
      if (existing >= 0) {
        return ls.map((l, i) => (i === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...ls,
        {
          itemId: pick.kind === "item" ? pick.id : null,
          packageId: pick.kind === "package" ? pick.id : null,
          catalogValue: pick.value,
          description: pick.itemName,
          variationName: pick.variationName,
          note: "",
          quantity: 1,
          unitPrice: centsToDecimal(pick.priceCents),
          addOnIds: [],
        },
      ];
    });
    setQuery("");
    setActiveIdx(0);
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    // Enter in the search must NEVER submit the order — it adds the highlighted item.
    if (e.key === "Enter") {
      e.preventDefault();
      if (matches.length) addPick(matches[Math.min(activeIdx, matches.length - 1)]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  const addCustomLine = () =>
    setLines((ls) => [
      ...ls,
      { itemId: null, packageId: null, description: "", variationName: "", note: "", quantity: 1, unitPrice: "0", addOnIds: [] },
    ]);

  return (
    <form action={action}>
      {order && <input type="hidden" name="id" value={order.id} />}
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      {/* Details */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Details</h2>
        <div className="grid2">
          <div className="field">
            <label htmlFor="title">Invoice title</label>
            <input id="title" name="title" defaultValue={order?.title ?? ""} placeholder="e.g. Spring order" />
          </div>
          <div className="field">
            <label htmlFor="invoiceId">Invoice ID</label>
            <input type="hidden" name="invoiceId" value={submittedInvoiceId} />
            <input
              id="invoiceId"
              value={invoiceId}
              onChange={(e) => {
                setInvoiceId(e.target.value);
                setInvoiceTouched(true);
              }}
              placeholder="Auto-assigned"
            />
          </div>
        </div>
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
            <input id="dueDate" name="dueDate" type="date" defaultValue={order?.dueDate ? isoDate(order.dueDate) : ""} />
          </div>
          <div className="field">
            <label htmlFor="currency">Currency</label>
            <input id="currency" name="currency" defaultValue={order?.currency ?? "USD"} />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Line items</h2>
        <div className="combo-wrap" style={{ marginBottom: "1rem" }}>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onSearchKey}
            placeholder="🔍 Search items to add… (↑↓ then Enter)"
            autoComplete="off"
          />
          {matches.length > 0 && (
            <div className="combo-results">
              {matches.map((m, i) => (
                <div
                  key={m.value}
                  className={`combo-item ${i === activeIdx ? "active" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); addPick(m); }}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  <span>{m.isPackage ? "📦 " : ""}{m.label}</span>
                  <span className="price">{formatMoney(m.priceCents)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <table className="line-items">
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ textAlign: "center", width: 110 }}>Qty</th>
              <th style={{ textAlign: "right", width: 110 }}>Unit price</th>
              <th style={{ textAlign: "right", width: 90 }}>Amount</th>
              <th style={{ width: 92 }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={5} className="muted small" style={{ padding: "1.25rem", textAlign: "center" }}>
                  Search above to add items, or add a custom line.
                </td>
              </tr>
            )}
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="Description" />
                  {l.variationName && (
                    <div><span className="variation-tag">{l.variationName}</span></div>
                  )}
                  {lineAddOns(l).length > 0 && (
                    <div className="line-addons">
                      {lineAddOns(l).map((a) => (
                        <label key={a.id} className={`line-addon ${l.addOnIds.includes(a.id) ? "on" : ""}`}>
                          <input
                            type="checkbox"
                            checked={l.addOnIds.includes(a.id)}
                            onChange={() => toggleLineAddOn(i, a.id)}
                          />
                          {a.name} <span className="muted">+{formatMoney(a.priceCents)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <input
                    className="line-note"
                    value={l.note}
                    onChange={(e) => updateLine(i, { note: e.target.value })}
                    placeholder="+ Add a note (prints on invoice)"
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
                      onBlur={() => { if (l.quantity < 1) updateLine(i, { quantity: 1 }); }}
                    />
                    <button type="button" onClick={() => updateLine(i, { quantity: l.quantity + 1 })}>+</button>
                  </div>
                </td>
                <td>
                  <input className="right" inputMode="decimal" value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: e.target.value })} />
                </td>
                <td className="right num" style={{ paddingTop: "0.85rem" }}>
                  {formatMoney(lineUnitCents(l) * l.quantity)}
                </td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="icon-btn" title="Move up" disabled={i === 0} onClick={() => moveLine(i, -1)}>▲</button>
                    <button type="button" className="icon-btn" title="Move down" disabled={i === lines.length - 1} onClick={() => moveLine(i, 1)}>▼</button>
                    <button type="button" className="icon-btn danger" title="Remove" onClick={() => removeLine(i)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="actions" style={{ marginTop: "1rem" }}>
          <button type="button" className="btn secondary btn-sm" onClick={addCustomLine}>+ Custom line</button>
        </div>
      </div>

      {/* Charges */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Charges</h2>
        <div className="grid3">
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

        {processingFeePercent > 0 ? (
          <label className="fee-toggle">
            <input type="checkbox" name="applyProcessingFee" checked={applyFee} onChange={(e) => setApplyFee(e.target.checked)} style={{ width: "auto" }} />
            Add card processing fee ({processingFeePercent}%) to the customer&apos;s total
          </label>
        ) : (
          <p className="small muted">Set a card processing fee rate in Settings to pass it to customers.</p>
        )}

        <div className="summary-box">
          <SummaryRow label="Subtotal" value={formatMoney(subtotalCents)} />
          {dollarsToCents(discount) > 0 && <SummaryRow label="Discount" value={`-${formatMoney(dollarsToCents(discount))}`} />}
          {dollarsToCents(tax) > 0 && <SummaryRow label="Tax" value={formatMoney(dollarsToCents(tax))} />}
          {dollarsToCents(shipping) > 0 && <SummaryRow label="Shipping" value={formatMoney(dollarsToCents(shipping))} />}
          {feeCents > 0 && <SummaryRow label={`Card processing fee (${processingFeePercent}%)`} value={formatMoney(feeCents)} />}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1.15rem", marginTop: "0.4rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
            <span>Total</span>
            <span className="num">{formatMoney(totalCents)}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Messages</h2>
        <div className="field">
          <label htmlFor="invoiceMessage">Message on invoice</label>
          <textarea id="invoiceMessage" name="invoiceMessage" rows={2} defaultValue={order?.invoiceMessage ?? ""} placeholder="A note that prints on the invoice for the customer…" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="notes">Internal notes</label>
          <textarea id="notes" name="notes" rows={2} defaultValue={order?.notes ?? ""} placeholder="Not shown to the customer" />
        </div>
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
