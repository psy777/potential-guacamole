import { getCurrentContact } from "@/lib/auth/wholesale";
import { cartCount } from "@/lib/services/wholesale";
import { PortalNav } from "@/components/portal-nav";

// The portal shell. It never redirects — the login page lives inside it and
// must render unauthenticated. Protected pages call requireContact() themselves.
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const contact = await getCurrentContact();
  const count = contact ? await cartCount(contact.id) : 0;

  return (
    <div className="portal">
      {contact && (
        <PortalNav companyName={contact.companyName} cartCount={count} />
      )}
      <main className="container">{children}</main>
    </div>
  );
}
