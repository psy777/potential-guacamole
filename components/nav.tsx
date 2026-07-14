import Link from "next/link";
import type { User } from "@/lib/db/schema";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/contacts", label: "Contacts" },
  { href: "/items", label: "Items" },
  { href: "/packages", label: "Packages" },
  { href: "/notes", label: "Notes" },
  { href: "/settings", label: "Settings" },
];

export function Nav({ user }: { user: User }) {
  return (
    <nav className="app-nav">
      <span className="brand">🔥 FireCoast</span>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="navlink">
          {l.label}
        </Link>
      ))}
      {user.role === "admin" && (
        <Link href="/users" className="navlink">
          Users
        </Link>
      )}
      <span className="spacer" />
      <span className="who">{user.name}</span>
      <Link href="/logout" className="navlink">
        Log out
      </Link>
    </nav>
  );
}
