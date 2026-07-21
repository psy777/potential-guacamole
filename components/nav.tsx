import Link from "next/link";
import type { User } from "@/lib/db/schema";

const LINKS = [
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
      <div className="nav-inner">
        <Link href="/" className="brand">🔥 FireCoast</Link>
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
        <form action="/logout" method="post" style={{ display: "inline" }}>
          <button
            type="submit"
            className="navlink"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              font: "inherit",
              color: "inherit",
              padding: "0.9rem 0.2rem",
            }}
          >
            Log out
          </button>
        </form>
      </div>
    </nav>
  );
}
