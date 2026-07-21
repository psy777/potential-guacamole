import Link from "next/link";
import { requireContact } from "@/lib/auth/wholesale";
import { portalCatalog } from "@/lib/services/wholesale";
import { formatMoney } from "@/lib/money";

export default async function CatalogPage() {
  const contact = await requireContact();
  const catalog = await portalCatalog(contact);

  return (
    <>
      <div className="portal-hero">
        <h1>Catalog</h1>
        <p>Prices shown are your wholesale prices. Click an item to see options and order.</p>
      </div>

      {catalog.length === 0 ? (
        <div className="card ws-empty">
          The catalog is being set up. Please check back soon.
        </div>
      ) : (
        <div className="catalog-grid">
          {catalog.map((item) => {
            const from = Math.min(...item.variations.map((v) => v.wholesaleCents));
            const multiple = item.variations.length > 1;
            return (
              <Link key={item.id} href={`/portal/catalog/${item.id}`} className="card cat-card">
                <div className="cat-thumb" aria-hidden>
                  {item.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imagePath} alt="" />
                  ) : (
                    "✝"
                  )}
                </div>
                <div className="cat-body">
                  {item.category && <div className="cat-cat">{item.category}</div>}
                  <div className="cat-name">{item.name}</div>
                  <div className="cat-price">
                    {multiple && <span className="cat-from">from </span>}
                    <span className="v-ws">{formatMoney(from)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
