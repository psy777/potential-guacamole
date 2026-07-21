import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/auth/session";

// POST only — a GET here is dangerous because Next.js prefetches <Link>s in
// production, which would silently log the user out on every page. The nav logs
// out via a form POST instead.
export async function POST(req: NextRequest) {
  await destroySession();
  // 303 so the browser follows with a GET to the login page.
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
