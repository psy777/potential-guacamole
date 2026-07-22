"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";

type Variation = {
  variationId: string;
  variationName: string;
  wholesaleCents: number;
  explicit: boolean;
};
type AddOn = { id: string; name: string; priceCents: number };

export function PortalAddToCart({
  itemId,
  variations,
  addOns,
  single,
  action,
}: {
  itemId: string;
  variations: Variation[];
  addOns: AddOn[];
  single: boolean;
  action: (fd: FormData) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const extra = addOns
    .filter((a) => selected.has(a.id))
    .reduce((s, a) => s + a.priceCents, 0);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {addOns.length > 0 && (
        <div className="addon-choices">
          <div className="cat-cat">Add-ons</div>
          {addOns.map((a) => (
            <label key={a.id} className={`addon-choice ${selected.has(a.id) ? "on" : ""}`}>
              <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
              <span className="addon-name">{a.name}</span>
              <span className="addon-price">+{formatMoney(a.priceCents)}</span>
            </label>
          ))}
        </div>
      )}

      <table className="ws-table" style={{ marginTop: "1rem" }}>
        <thead>
          <tr>
            <th>{single ? "" : "Option"}</th>
            <th className="num">Your price</th>
            <th style={{ width: "170px" }}></th>
          </tr>
        </thead>
        <tbody>
          {variations.map((v) => (
            <tr key={v.variationId}>
              <td>
                {single ? "Wholesale" : v.variationName}
                {v.explicit && <span className="muted small" style={{ display: "block" }}>set price</span>}
              </td>
              <td className="num">
                <span className="v-ws">{formatMoney(v.wholesaleCents + extra)}</span>
                {extra > 0 && (
                  <span className="v-msrp" style={{ marginLeft: "0.4rem", textDecoration: "none" }}>
                    ({formatMoney(v.wholesaleCents)} + {formatMoney(extra)})
                  </span>
                )}
              </td>
              <td>
                <form action={action} className="add-row">
                  <input type="hidden" name="itemId" value={itemId} />
                  <input type="hidden" name="variationId" value={v.variationId} />
                  {[...selected].map((id) => (
                    <input key={id} type="hidden" name="addOn" value={id} />
                  ))}
                  <input
                    name="quantity"
                    type="number"
                    min={1}
                    defaultValue={1}
                    aria-label={`Quantity for ${v.variationName}`}
                  />
                  <button type="submit" className="btn btn-sm">Add</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
