"use client";

import { useState } from "react";
import { centsToDecimal, dollarsToCents, formatMoney } from "@/lib/money";
import type { ItemWithVariations } from "@/lib/services/items";

type Row = {
  name: string;
  sku: string;
  gtin: string;
  price: string;
  wholesale: string;
  imagePath: string;
  skuTouched: boolean;
};

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 14);

function blankRow(price = ""): Row {
  return { name: "", sku: "", gtin: "", price, wholesale: "", imagePath: "", skuTouched: false };
}

function initialRows(item?: ItemWithVariations): Row[] {
  const rows: Row[] =
    item && item.variations.length > 0
      ? item.variations.map((v) => ({
          name: v.name,
          sku: v.sku,
          gtin: v.gtin,
          price: centsToDecimal(v.priceCents),
          wholesale: v.wholesalePriceCents != null ? centsToDecimal(v.wholesalePriceCents) : "",
          imagePath: v.imagePath,
          skuTouched: true,
        }))
      : item
      ? [{ name: "Regular", sku: item.sku, gtin: "", price: centsToDecimal(item.priceCents), wholesale: "", imagePath: "", skuTouched: !!item.sku }]
      : [];
  rows.push(blankRow()); // always a trailing blank to type into
  return rows;
}

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) return null;
  const json = await res.json();
  return json.path ?? null;
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
  const [name, setName] = useState(item?.name ?? "");
  const [imagePath, setImagePath] = useState(item?.imagePath ?? "");
  const [rows, setRows] = useState<Row[]>(initialRows(item));
  const [optionsText, setOptionsText] = useState("");

  const autoSku = (varName: string) =>
    varName.trim() ? `${slug(name) || "item"}-${slug(varName)}`.toUpperCase() : "";

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const changeName = (i: number, value: string) =>
    setRows((rs) => {
      const next = rs.map((r, idx) =>
        idx === i ? { ...r, name: value, sku: r.skuTouched ? r.sku : autoSku(value) } : r
      );
      // Auto-add a fresh row (inheriting the price) once you type in the last one.
      if (i === rs.length - 1 && value.trim()) next.push(blankRow(rs[i].price));
      return next;
    });

  const removeRow = (i: number) =>
    setRows((rs) => {
      const next = rs.filter((_, idx) => idx !== i);
      if (next.length === 0 || next[next.length - 1].name.trim()) next.push(blankRow());
      return next;
    });

  const autoFillSkus = () =>
    setRows((rs) => rs.map((r) => (r.name.trim() && !r.skuTouched ? { ...r, sku: autoSku(r.name) } : r)));

  const generateFromOptions = () => {
    const values = optionsText.split(",").map((s) => s.trim()).filter(Boolean);
    if (!values.length) return;
    const carryPrice = rows[rows.length - 1]?.price ?? "";
    setRows((rs) => {
      const startFresh = rs.length === 1 && !rs[0].name;
      const generated: Row[] = values.map((v) => ({ ...blankRow(carryPrice), name: v, sku: autoSku(v) }));
      const kept = startFresh ? [] : rs.filter((r) => r.name.trim());
      return [...kept, ...generated, blankRow(carryPrice)];
    });
    setOptionsText("");
  };

  const onVarFile = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const p = await uploadImage(f);
    if (p) updateRow(i, { imagePath: p });
  };
  const onItemFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const p = await uploadImage(f);
    if (p) setImagePath(p);
  };

  return (
    <form action={action} className="card">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="variations" value={JSON.stringify(rows)} />
      <input type="hidden" name="imagePath" value={imagePath} />

      <div className="grid2">
        <div className="field">
          <label htmlFor="name">Item name *</label>
          <input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <input id="category" name="category" list="category-list" defaultValue={item?.category ?? ""} placeholder="e.g. Standard" />
          <datalist id="category-list">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>

      <div className="grid2">
        <div className="field">
          <label>Image</label>
          {imagePath ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <img src={`/api/uploads/${imagePath}`} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
              <button type="button" className="btn ghost btn-sm" onClick={() => setImagePath("")}>Remove</button>
            </div>
          ) : (
            <label className="btn secondary btn-sm" style={{ cursor: "pointer", width: "fit-content" }}>
              Upload image
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={onItemFile} />
            </label>
          )}
        </div>
        <div className="field" style={{ display: "flex", alignItems: "end", gap: "0.4rem" }}>
          <input id="active" name="active" type="checkbox" defaultChecked={item ? item.active : true} style={{ width: "auto" }} />
          <label htmlFor="active" style={{ margin: 0 }}>Active</label>
          <input type="hidden" name="currency" value={item?.currency ?? "USD"} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={2} defaultValue={item?.description ?? ""} />
      </div>

      <h2>Variations</h2>
      <p className="small muted" style={{ marginTop: "-0.4rem" }}>
        Just start typing — a new row appears automatically, the SKU fills in, and the price carries down.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Variation</th>
              <th>SKU</th>
              <th>Barcode</th>
              <th className="right">Price</th>
              <th className="right">Wholesale</th>
              <th>Image</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><input value={r.name} onChange={(e) => changeName(i, e.target.value)} placeholder={i === rows.length - 1 ? "Type to add…" : "Regular"} /></td>
                <td><input value={r.sku} onChange={(e) => updateRow(i, { sku: e.target.value, skuTouched: true })} /></td>
                <td><input value={r.gtin} onChange={(e) => updateRow(i, { gtin: e.target.value })} /></td>
                <td style={{ width: 100 }}><input className="right" inputMode="decimal" value={r.price} onChange={(e) => updateRow(i, { price: e.target.value })} placeholder="0.00" /></td>
                <td style={{ width: 100 }}><input className="right" inputMode="decimal" value={r.wholesale} onChange={(e) => updateRow(i, { wholesale: e.target.value })} placeholder="auto" title="Explicit wholesale price. Blank = use the discount %." /></td>
                <td>
                  {r.imagePath ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <img src={`/api/uploads/${r.imagePath}`} alt="" style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" }} />
                      <button type="button" className="icon-btn" onClick={() => updateRow(i, { imagePath: "" })}>✕</button>
                    </div>
                  ) : (
                    <label className="btn secondary btn-sm" style={{ cursor: "pointer" }}>
                      +<input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onVarFile(i, e)} />
                    </label>
                  )}
                </td>
                <td className="right small muted num">
                  {formatMoney(dollarsToCents(r.price))}
                  <button type="button" className="icon-btn danger" style={{ marginLeft: 6 }} onClick={() => removeRow(i)} disabled={rows.length === 1}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="actions" style={{ marginTop: "0.75rem" }}>
        <button type="button" className="btn secondary btn-sm" onClick={autoFillSkus}>Auto-fill SKUs</button>
        <input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Generate from options: Small, Medium, Large" style={{ maxWidth: 320 }} />
        <button type="button" className="btn secondary btn-sm" onClick={generateFromOptions}>Generate</button>
      </div>

      <div className="actions" style={{ marginTop: "1.25rem" }}>
        <button type="submit" className="btn">Save item</button>
        <a href="/items" className="btn secondary">Cancel</a>
      </div>
    </form>
  );
}
