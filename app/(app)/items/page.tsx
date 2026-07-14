import Link from "next/link";
import { listItems, startingPriceCents } from "@/lib/services/items";
import { formatMoney } from "@/lib/money";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const items = listItems(q);

  return (
    <>
      <div className="header-row">
        <h1>Items</h1>
        <Link href="/items/new" className="btn">+ New item</Link>
      </div>

      <form className="card" method="get" style={{ padding: "0.75rem 1rem" }}>
        <input name="q" placeholder="Search items, SKUs, categories…" defaultValue={q ?? ""} />
      </form>

      <div className="card">
        {items.length === 0 ? (
          <p className="muted">No items yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Variations</th>
                <th className="right">Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const count = it.variations.length;
                const start = startingPriceCents(it);
                const priceLabel =
                  count > 1
                    ? `from ${formatMoney(start, it.currency)}`
                    : formatMoney(start, it.currency);
                return (
                  <tr key={it.id}>
                    <td>
                      <Link href={`/items/${it.id}`}>{it.name}</Link>
                    </td>
                    <td>{it.category || "—"}</td>
                    <td className="small muted">
                      {count <= 1 ? "—" : `${count} variations`}
                    </td>
                    <td className="right num">{priceLabel}</td>
                    <td>{it.active ? "Active" : "Inactive"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
