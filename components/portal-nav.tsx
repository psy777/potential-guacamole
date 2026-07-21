import Link from "next/link";
import { portalLogoutAction } from "@/app/(portal)/portal/actions";

export function PortalNav({
  companyName,
  cartCount,
}: {
  companyName: string;
  cartCount: number;
}) {
  return (
    <nav className="portal-nav">
      <div className="nav-inner">
        <Link href="/portal" className="brand">
          Comfort Cross
          <small>Wholesale</small>
        </Link>
        <Link href="/portal/catalog" className="navlink">
          Catalog
        </Link>
        <Link href="/portal/orders" className="navlink">
          Orders
        </Link>
        <span className="spacer" />
        <Link href="/portal/cart" className="navlink cartlink">
          Cart
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </Link>
        <Link href="/portal/account" className="navlink who" title="Your profile">
          {companyName}
        </Link>
        <form action={portalLogoutAction}>
          <button type="submit" className="navlink" style={{ background: "none", border: "none", cursor: "pointer" }}>
            Log out
          </button>
        </form>
      </div>
    </nav>
  );
}
