import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContact } from "@/lib/auth/wholesale";
import { getPortalItem } from "@/lib/services/wholesale";
import { ImageGallery } from "@/components/image-gallery";
import { PortalAddToCart } from "@/components/portal-add-to-cart";
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

          <PortalAddToCart
            itemId={item.id}
            single={single}
            variations={item.variations.map((v) => ({
              variationId: v.variationId,
              variationName: v.variationName,
              wholesaleCents: v.wholesaleCents,
              explicit: v.explicit,
            }))}
            addOns={item.addOns}
            action={addToCartAction}
          />
        </div>
      </div>
    </>
  );
}
