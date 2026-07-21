import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContact } from "@/lib/auth/wholesale";
import { getPortalItem } from "@/lib/services/wholesale";
import { formatMoney } from "@/lib/money";
import { ImageGallery } from "@/components/image-gallery";
import { addToCartAction } from "../../actions";

export default async function PortalItemDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const contact = await requireContact();
  const { id } = await params;
  const item = await getPortalItem(contact, id);
  if (!item) notFound();

  const single =
    item.variations.length === 1 && item.variations[0].variationName === "Regular";

  // The item photo plus any distinct variation photos, in order, de-duplicated.
  const images = Array.from(
    new Set([item.imagePath, ...item.variations.map((v) => v.imagePath)].filter(Boolean))
  );

  return (
    <>
      <p style={{ margin: "1rem 0 0.5rem" }}>
        <Link href="/portal/catalog" className="navlink" style={{ color: "var(--brand)" }}>
          ← Back to catalog
        </Link>
      </p>

      <div className="item-detail">
        <ImageGallery images={images} alt={item.name} />

        <div className="item-info">
          {item.category && <div className="cat-cat">{item.category}</div>}
          <h1 style={{ margin: "0.1rem 0 0.4rem" }}>{item.name}</h1>
          {item.description && <p className="muted">{item.description}</p>}

          <table className="ws-table" style={{ marginTop: "1rem" }}>
            <thead>
              <tr>
                <th>{single ? "" : "Option"}</th>
                <th className="num">Your price</th>
                <th style={{ width: "170px" }}></th>
              </tr>
            </thead>
            <tbody>
              {item.variations.map((v) => {
                const discounted = v.wholesaleCents < v.msrpCents;
                return (
                  <tr key={v.variationId}>
                    <td>
                      {single ? "Wholesale" : v.variationName}
                      {v.explicit && (
                        <span className="muted small" style={{ display: "block" }}>set price</span>
                      )}
                    </td>
                    <td className="num">
                      <span className="v-ws">{formatMoney(v.wholesaleCents)}</span>
                      {discounted && (
                        <span className="v-msrp" style={{ marginLeft: "0.4rem" }}>
                          {formatMoney(v.msrpCents)}
                        </span>
                      )}
                    </td>
                    <td>
                      <form action={addToCartAction} className="add-row">
                        <input type="hidden" name="itemId" value={v.itemId} />
                        <input type="hidden" name="variationId" value={v.variationId} />
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
