import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  WHOLESALE_COOKIE,
  PUBLIC_PATHS,
  PUBLIC_PREFIXES,
  PORTAL_PREFIX,
  PORTAL_LOGIN,
  PORTAL_PUBLIC_PATHS,
  WHOLESALE_SUBDOMAIN,
} from "@/lib/constants";

// The middleware runs on the Edge runtime and cannot touch the database, so it
// only checks for the PRESENCE of a session cookie and redirects if missing.
// Real session validation happens server-side (requireUser / requireContact).
//
// Two independent auth realms share one deployment:
//   - the internal Studio (fc_session cookie), everything outside /portal
//   - the wholesale portal (cc_wholesale cookie), under /portal — also reachable
//     cleanly at the wholesale.<domain> subdomain, which is rewritten into /portal.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = (req.headers.get("host") || "").split(":")[0];
  const onWholesaleHost =
    hostname.split(".")[0] === WHOLESALE_SUBDOMAIN && hostname.includes(".");
  const isApi = pathname.startsWith("/api");

  // Resolve which /portal path (if any) this request maps to.
  let portalPath: string | null = null;
  if (pathname === PORTAL_PREFIX || pathname.startsWith(`${PORTAL_PREFIX}/`)) {
    portalPath = pathname;
  } else if (onWholesaleHost && !isApi) {
    portalPath = pathname === "/" ? PORTAL_PREFIX : `${PORTAL_PREFIX}${pathname}`;
  }

  if (portalPath !== null) {
    const rewrite = () => {
      if (portalPath === pathname) return NextResponse.next();
      const url = req.nextUrl.clone();
      url.pathname = portalPath!;
      return NextResponse.rewrite(url);
    };

    if (PORTAL_PUBLIC_PATHS.includes(portalPath)) return rewrite();

    const hasWholesale = Boolean(req.cookies.get(WHOLESALE_COOKIE)?.value);
    if (!hasWholesale) {
      const url = req.nextUrl.clone();
      url.pathname = PORTAL_LOGIN;
      return NextResponse.redirect(url);
    }
    return rewrite();
  }

  // --- Internal Studio ---
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|css|js)$).*)"],
};
