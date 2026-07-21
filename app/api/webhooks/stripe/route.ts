import { NextResponse } from "next/server";
import { verifyStripeWebhook } from "@/lib/services/payments/stripe";
import { reconcileOrder, reconcileOpenPayments } from "@/lib/services/payments";
import { rememberWebhook } from "@/lib/services/webhooks";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const event = verifyStripeWebhook(body, signature);
  if (!event) {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Idempotency: ignore events we've already processed.
  if (!(await rememberWebhook("stripe", event.id, event.type, body))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const obj = event.data.object as { metadata?: { orderId?: string } };
  const orderId = obj?.metadata?.orderId;
  try {
    if (orderId) await reconcileOrder(orderId);
    else await reconcileOpenPayments();
  } catch (err) {
    console.error("[webhook:stripe]", (err as Error).message);
  }

  return NextResponse.json({ received: true });
}
