"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import type { PackageWithMembers } from "@/lib/services/packages";

type ItemOption = { id: string; name: string; priceCents: number; currency: string };
type Member = { itemId: string; quantity: number };

export function PackageForm({
  action,
  items,
  pkg,
}: {
  action: (formData: FormData) => Promise<void>;
  items: ItemOption[];
  pkg?: PackageWithMembers;
}) {
  const [members, setMembers] = useState<Member[]>(
    pkg?.members.map((m) => ({ itemId: m.itemId, quantity: m.quantity })) ?? []
  );

  const priceOf = (id: string) => items.find((i) => i.id === id)?.priceCents ?? 0;
  const totalCents = members.reduce(
    (sum, m) => sum + priceOf(m.itemId) * m.quantity,
    0
  );

  const addRow = () =>
    setMembers((m) => [...m, { itemId: items[0]?.id ?? "", quantity: 1 }]);
  const removeRow = (i: number) =>
    setMembers((m) => m.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<Member>) =>
    setMembers((m) => m.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  return (
    <form action={action} className="card">
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <input type="hidden" name="members" value={JSON.stringify(members)} />

      <div className="field">
        <label htmlFor="name">Package name *</label>
        <input id="name" name="name" required defaultValue={pkg?.name ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={2} defaultValue={pkg?.description ?? ""} />
      </div>
      <div className="field" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <input
          id="active"
          name="active"
          type="checkbox"
          defaultChecked={pkg ? pkg.active : true}
          style={{ width: "auto" }}
        />
        <label htmlFor="active" style={{ margin: 0 }}>Active</label>
      </div>

      <h2>Items in this package</h2>
      {items.length === 0 && (
        <p className="notice info">Create some items first to add them to a package.</p>
      )}
      {members.map((m, i) => (
        <div key={i} className="grid3" style={{ alignItems: "end", marginBottom: "0.5rem" }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Item</label>
            <select
              value={m.itemId}
              onChange={(e) => update(i, { itemId: e.target.value })}
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({formatMoney(it.priceCents, it.currency)})
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Qty</label>
            <input
              type="number"
              min={1}
              value={m.quantity}
              onChange={(e) => update(i, { quantity: Number(e.target.value) })}
            />
          </div>
          <div>
            <button type="button" className="btn danger btn-sm" onClick={() => removeRow(i)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn secondary btn-sm" onClick={addRow} disabled={!items.length}>
        + Add item
      </button>

      <p style={{ marginTop: "1rem", fontWeight: 600 }}>
        Package total: {formatMoney(totalCents)}
      </p>

      <div className="actions">
        <button type="submit" className="btn">Save package</button>
        <a href="/packages" className="btn secondary">Cancel</a>
      </div>
    </form>
  );
}
