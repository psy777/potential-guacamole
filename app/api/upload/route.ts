import { NextResponse } from "next/server";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";

export const runtime = "nodejs";

// ext -> mime. Images are stored in the database so they survive on hosts with
// an ephemeral filesystem (Render).
const ALLOWED: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/** Accepts one image, stores it in the DB, and returns its served path. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const ext = path.extname(file.name).toLowerCase();
  const mimeType = ALLOWED[ext];
  if (!mimeType) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image is too large (max 8MB)." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const row = (
    await db
      .insert(images)
      .values({ mimeType, data: buf.toString("base64") })
      .returning()
  )[0];

  // imagePath now holds the full served path.
  return NextResponse.json({ path: `/api/images/${row.id}` });
}
