import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { UPLOAD_DIR } from "@/lib/config";

export const runtime = "nodejs";

const ALLOWED = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

/** Accepts one image file, stores it, and returns its served filename. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED.has(ext)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image is too large (max 8MB)." }, { status: 400 });
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `img-${randomUUID()}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);

  return NextResponse.json({ path: filename });
}
