import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  PUBLIC_PATHS,
  PUBLIC_PREFIXES,
} from "@/lib/constants";

// The middleware runs on the Edge runtime and cannot touch the database, so it
// only checks for the PRESENCE of a session cookie and redirects if missing.
// Real session validation happens server-side in requireUser().
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
