import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";

export const runtime = "nodejs";

// Product images are not sensitive and must be viewable by wholesale-portal
// customers (who aren't Studio users), so this route is public — see middleware.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = (await db.select().from(images).where(eq(images.id, id)).limit(1))[0];
  if (!row) return new NextResponse("Not found", { status: 404 });

  const buf = Buffer.from(row.data, "base64");
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": row.mimeType,
      // Content is immutable (new upload = new id), so cache aggressively.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
