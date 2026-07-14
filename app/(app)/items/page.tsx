import Link from "next/link";
import { listItems } from "@/lib/services/items";
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
        <input name="q" placeholder="Search items…" defaultValue={q ?? ""} />
      </form>

      <div className="card">
        {items.length === 0 ? (
          <p className="muted">No items yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th className="right">Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>
                    <Link href={`/items/${it.id}`}>{it.name}</Link>
                  </td>
                  <td>{it.sku || "—"}</td>
                  <td className="right num">{formatMoney(it.priceCents, it.currency)}</td>
                  <td>{it.active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
