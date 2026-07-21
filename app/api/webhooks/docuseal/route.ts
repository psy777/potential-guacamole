import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import {
  verifyDocusealWebhook,
  syncDocument,
} from "@/lib/services/documents/docuseal";
import { rememberWebhook } from "@/lib/services/webhooks";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const signature =
    req.headers.get("x-docuseal-signature") ?? req.headers.get("authorization");

  if (!verifyDocusealWebhook(signature)) {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  let submissionId = "";
  let eventType = "";
  try {
    const parsed = JSON.parse(body);
    eventType = parsed.event_type ?? "";
    submissionId = String(
      parsed.data?.submission_id ?? parsed.data?.id ?? ""
    );
  } catch {
    return new NextResponse("Bad payload", { status: 400 });
  }

  if (submissionId && !(await rememberWebhook("docuseal", `${submissionId}:${eventType}`, eventType, body))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const doc = (
      await db
        .select()
        .from(documents)
        .where(eq(documents.submissionId, submissionId))
        .limit(1)
    )[0];
    if (doc) await syncDocument(doc);
  } catch (err) {
    console.error("[webhook:docuseal]", (err as Error).message);
  }

  return NextResponse.json({ received: true });
}
