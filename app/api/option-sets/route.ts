import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listOptionSets, saveOptionSet } from "@/lib/services/options";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await listOptionSets());
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const values = Array.isArray(body?.values) ? body.values.map(String) : [];
  if (!name || values.filter((v: string) => v.trim()).length === 0) {
    return NextResponse.json({ error: "A name and at least one value are required." }, { status: 400 });
  }
  return NextResponse.json(await saveOptionSet(name, values));
}
