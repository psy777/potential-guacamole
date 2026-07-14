import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { APP_URL } from "@/lib/config";

export async function GET() {
  await destroySession();
  return NextResponse.redirect(new URL("/login", APP_URL));
}
