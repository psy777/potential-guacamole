import { requireContact } from "@/lib/auth/wholesale";
import { portalCatalog, type PortalVariation } from "@/lib/services/wholesale";
import { formatMoney } from "@/lib/money";
import { addToCartAction } from "../actions";

function VariationRow({ v, single }: { v: PortalVariation; single: boolean }) {
  const discounted = v.wholesaleCents < v.msrpCents;
  return (
    <div className="cat-var">
      <div className="v-name">
        {single ? "Wholesale" : v.variationName}
        {v.explicit && (
          <span className="muted small" style={{ display: "block" }}>
            set price
          </span>
        )}
      </div>
      <div className="v-price">
        <div className="v-ws">{formatMoney(v.wholesaleCents)}</div>
        {discounted && <div className="v-msrp">{formatMoney(v.msrpCents)}</div>}
      </div>
      <form action={addToCartAction} className="add-row">
        <input type="hidden" name="itemId" value={v.itemId} />
        <input type="hidden" name="variationId" value={v.variationId} />
        <input
          name="quantity"
          type="number"
          min={1}
          defaultValue={1}
          aria-label={`Quantity for ${v.itemName} ${v.variationName}`}
        />
        <button type="submit" className="btn btn-sm">
          Add
        </button>
      </form>
    </div>
  );
}

export default async function CatalogPage() {
  const contact = await requireContact();
  const catalog = await portalCatalog(contact);

  return (
    <>
      <div className="portal-hero">
        <h1>Catalog</h1>
        <p>Prices shown are your wholesale prices. Add items to your cart to order.</p>
      </div>

      {catalog.length === 0 ? (
        <div className="card ws-empty">
          The catalog is being set up. Please check back soon.
        </div>
      ) : (
        <div className="catalog-grid">
          {catalog.map((item) => {
            const single =
              item.variations.length === 1 &&
              item.variations[0].variationName === "Regular";
            return (
              <div key={item.id} className="card cat-card">
                <div className="cat-thumb" aria-hidden>
                  ✝
                </div>
                <div className="cat-body">
                  {item.category && <div className="cat-cat">{item.category}</div>}
                  <div className="cat-name">{item.name}</div>
                  {item.variations.map((v) => (
                    <VariationRow key={v.variationId} v={v} single={single} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
