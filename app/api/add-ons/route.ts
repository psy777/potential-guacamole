import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listAddOns, createAddOn } from "@/lib/services/addons";
import { dollarsToCents } from "@/lib/money";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await listAddOns());
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  // Accept either a dollar string ("5.00") or integer cents.
  const priceCents =
    typeof body?.priceCents === "number"
      ? Math.round(body.priceCents)
      : dollarsToCents(String(body?.price ?? "0"));
  if (!name) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }
  return NextResponse.json(await createAddOn(name, priceCents));
}
