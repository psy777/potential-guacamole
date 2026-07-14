import type { Item } from "@/lib/db/schema";
import { centsToDecimal } from "@/lib/money";

export function ItemForm({
  action,
  item,
}: {
  action: (formData: FormData) => Promise<void>;
  item?: Item;
}) {
  return (
    <form action={action} className="card">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid2">
        <div className="field">
          <label htmlFor="name">Name *</label>
          <input id="name" name="name" required defaultValue={item?.name ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="sku">SKU / barcode</label>
          <input id="sku" name="sku" defaultValue={item?.sku ?? ""} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={2} defaultValue={item?.description ?? ""} />
      </div>
      <div className="grid3">
        <div className="field">
          <label htmlFor="price">Price</label>
          <input
            id="price"
            name="price"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={item ? centsToDecimal(item.priceCents) : ""}
          />
        </div>
        <div className="field">
          <label htmlFor="currency">Currency</label>
          <input id="currency" name="currency" defaultValue={item?.currency ?? "USD"} />
        </div>
        <div className="field" style={{ display: "flex", alignItems: "end", gap: "0.4rem" }}>
          <input
            id="active"
            name="active"
            type="checkbox"
            defaultChecked={item ? item.active : true}
            style={{ width: "auto" }}
          />
          <label htmlFor="active" style={{ margin: 0 }}>Active</label>
        </div>
      </div>
      <div className="actions">
        <button type="submit" className="btn">Save item</button>
        <a href="/items" className="btn secondary">Cancel</a>
      </div>
    </form>
  );
}
