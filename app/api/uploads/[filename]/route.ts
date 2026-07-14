import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth/session";
import { UPLOAD_DIR } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { filename } = await params;
  // Only ever serve a bare filename from the upload dir — no traversal.
  const safe = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safe);
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buf = fs.readFileSync(filePath);
  const type = safe.endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${safe}"`,
    },
  });
}
