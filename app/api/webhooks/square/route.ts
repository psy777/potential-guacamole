import { NextResponse } from "next/server";
import { verifySquareWebhook } from "@/lib/services/payments/square";
import { reconcileOpenPayments } from "@/lib/services/payments";
import { rememberWebhook } from "@/lib/services/webhooks";
import { APP_URL } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature");
  const notificationUrl = `${APP_URL}/api/webhooks/square`;

  if (!verifySquareWebhook(body, signature, notificationUrl)) {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  let eventId = "";
  let eventType = "";
  try {
    const parsed = JSON.parse(body);
    eventId = parsed.event_id ?? "";
    eventType = parsed.type ?? "";
  } catch {
    // ignore
  }

  if (eventId && !(await rememberWebhook("square", eventId, eventType, body))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    // Square events don't map cleanly to one order; catch everything up.
    await reconcileOpenPayments();
  } catch (err) {
    console.error("[webhook:square]", (err as Error).message);
  }

  return NextResponse.json({ received: true });
}
