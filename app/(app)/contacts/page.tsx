import Link from "next/link";
import { listContacts } from "@/lib/services/contacts";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const contacts = listContacts(q);

  return (
    <>
      <div className="header-row">
        <h1>Contacts</h1>
        <Link href="/contacts/new" className="btn">+ New contact</Link>
      </div>

      <form className="card" method="get" style={{ padding: "0.75rem 1rem" }}>
        <input name="q" placeholder="Search contacts…" defaultValue={q ?? ""} />
      </form>

      <div className="card">
        {contacts.length === 0 ? (
          <p className="muted">No contacts found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/contacts/${c.id}`}>{c.companyName}</Link>
                  </td>
                  <td>{c.contactName || "—"}</td>
                  <td>{c.email || "—"}</td>
                  <td>{c.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
