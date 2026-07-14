"use client";

import { useRef, useState } from "react";
import { centsToDecimal, dollarsToCents, formatMoney } from "@/lib/money";
import type { ItemWithVariations } from "@/lib/services/items";

type VariationRow = {
  name: string;
  sku: string;
  gtin: string;
  price: string; // dollars, as typed
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 12);

function initialRows(item?: ItemWithVariations): VariationRow[] {
  if (item && item.variations.length > 0) {
    return item.variations.map((v) => ({
      name: v.name,
      sku: v.sku,
      gtin: v.gtin,
      price: centsToDecimal(v.priceCents),
    }));
  }
  if (item) {
    // Legacy item with no variations — seed one from its base price.
    return [{ name: "Regular", sku: item.sku, gtin: "", price: centsToDecimal(item.priceCents) }];
  }
  return [{ name: "Regular", sku: "", gtin: "", price: "" }];
}

export function ItemForm({
  action,
  item,
  categories,
}: {
  action: (formData: FormData) => Promise<void>;
  item?: ItemWithVariations;
  categories: string[];
}) {
  const [rows, setRows] = useState<VariationRow[]>(initialRows(item));
  const [optionsText, setOptionsText] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const total = (r: VariationRow) => dollarsToCents(r.price);

  const update = (i: number, patch: Partial<VariationRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { name: "", sku: "", gtin: "", price: "" }]);
  const removeRow = (i: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

  const autoSku = () => {
    const base = slug(nameRef.current?.value || "item") || "item";
    setRows((rs) =>
      rs.map((r, i) => ({
        ...r,
        sku: r.sku || `${base}-${slug(r.name) || i + 1}`.toUpperCase(),
      }))
    );
  };

  const generateFromOptions = () => {
    const values = optionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!values.length) return;
    setRows((rs) => {
      // If the only row is the untouched default, replace it.
      const startFresh =
        rs.length === 1 && rs[0].name === "Regular" && !rs[0].sku && !rs[0].price;
      const generated = values.map((name) => ({ name, sku: "", gtin: "", price: "" }));
      return startFresh ? generated : [...rs, ...generated];
    });
    setOptionsText("");
  };

  return (
    <form action={action} className="card">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="variations" value={JSON.stringify(rows)} />

      <div className="grid2">
        <div className="field">
          <label htmlFor="name">Item name *</label>
          <input id="name" name="name" required ref={nameRef} defaultValue={item?.name ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <input id="category" name="category" list="category-list" defaultValue={item?.category ?? ""} placeholder="e.g. Apparel" />
          <datalist id="category-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={2} defaultValue={item?.description ?? ""} />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="currency">Currency</label>
          <input id="currency" name="currency" defaultValue={item?.currency ?? "USD"} />
        </div>
        <div className="field" style={{ display: "flex", alignItems: "end", gap: "0.4rem" }}>
          <input id="active" name="active" type="checkbox" defaultChecked={item ? item.active : true} style={{ width: "auto" }} />
          <label htmlFor="active" style={{ margin: 0 }}>Active</label>
        </div>
      </div>

      <h2>Variations</h2>
      <p className="small muted" style={{ marginTop: "-0.4rem" }}>
        Each variation is its own sellable version with its own SKU, barcode, and price.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Variation</th>
              <th>SKU</th>
              <th>Barcode (GTIN)</th>
              <th className="right">Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Regular" />
                </td>
                <td>
                  <input value={r.sku} onChange={(e) => update(i, { sku: e.target.value })} />
                </td>
                <td>
                  <input value={r.gtin} onChange={(e) => update(i, { gtin: e.target.value })} />
                </td>
                <td style={{ width: 110 }}>
                  <input className="right" inputMode="decimal" value={r.price} onChange={(e) => update(i, { price: e.target.value })} placeholder="0.00" />
                </td>
                <td className="right small muted num">
                  {formatMoney(total(r))}
                  <button type="button" className="btn danger btn-sm" style={{ marginLeft: 6 }} onClick={() => removeRow(i)} disabled={rows.length === 1}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="actions" style={{ marginTop: "0.75rem" }}>
        <button type="button" className="btn secondary btn-sm" onClick={addRow}>+ Add variation</button>
        <button type="button" className="btn secondary btn-sm" onClick={autoSku}>Auto-fill SKUs</button>
      </div>

      <div className="actions" style={{ marginTop: "0.75rem" }}>
        <input
          value={optionsText}
          onChange={(e) => setOptionsText(e.target.value)}
          placeholder="Generate from options, e.g. Small, Medium, Large"
          style={{ maxWidth: 320 }}
        />
        <button type="button" className="btn secondary btn-sm" onClick={generateFromOptions}>
          Generate variations
        </button>
      </div>

      <div className="actions" style={{ marginTop: "1.25rem" }}>
        <button type="submit" className="btn">Save item</button>
        <a href="/items" className="btn secondary">Cancel</a>
      </div>
    </form>
  );
}
