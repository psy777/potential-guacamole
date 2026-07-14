import Link from "next/link";
import { listPackages, packagePriceCents } from "@/lib/services/packages";
import { formatMoney } from "@/lib/money";

export default async function PackagesPage() {
  const packages = listPackages();

  return (
    <>
      <div className="header-row">
        <h1>Packages</h1>
        <Link href="/packages/new" className="btn">+ New package</Link>
      </div>

      <div className="card">
        {packages.length === 0 ? (
          <p className="muted">No packages yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Items</th>
                <th className="right">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/packages/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.members.length}</td>
                  <td className="right num">{formatMoney(packagePriceCents(p))}</td>
                  <td>{p.active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
