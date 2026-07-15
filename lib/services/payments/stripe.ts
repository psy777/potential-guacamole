import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, type Order, type Contact } from "@/lib/db/schema";
import { stripe as stripeConfig, APP_URL } from "@/lib/config";
import type { PaymentProvider, PaymentLink } from "./types";
import { upsertProviderPayment } from "./upsert";

let client: Stripe | null = null;
function stripe(): Stripe {
  if (!client) client = new Stripe(stripeConfig.secretKey);
  return client;
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",

  isConfigured() {
    return stripeConfig.isConfigured;
  },

  async createPaymentLink(
    order: Order,
    _contact,
    amountCents: number
  ): Promise<PaymentLink> {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: order.currency.toLowerCase(),
            product_data: { name: `Order ${order.number}` },
            unit_amount: amountCents,
          },
        },
      ],
      success_url: `${APP_URL}/orders/${order.id}?paid=1`,
      cancel_url: `${APP_URL}/orders/${order.id}`,
      metadata: { orderId: order.id, orderNumber: order.number },
    });

    db.update(orders)
      .set({
        stripeCheckoutId: session.id,
        paymentLinkUrl: session.url ?? null,
        paymentLinkProvider: "stripe",
        paymentLinkAmountCents: amountCents,
      })
      .where(eq(orders.id, order.id))
      .run();

    return { url: session.url ?? "", providerRef: session.id };
  },

  async syncOrder(order: Order): Promise<void> {
    if (!order.stripeCheckoutId) return;
    const session = await stripe().checkout.sessions.retrieve(
      order.stripeCheckoutId,
      { expand: ["payment_intent"] }
    );
    if (session.payment_status !== "paid") return;

    const pi = session.payment_intent as Stripe.PaymentIntent | string | null;
    const paymentId =
      typeof pi === "string" ? pi : pi?.id ?? session.id;

    upsertProviderPayment({
      orderId: order.id,
      provider: "stripe",
      providerPaymentId: paymentId,
      amountCents: session.amount_total ?? order.totalCents,
      currency: (session.currency ?? order.currency).toUpperCase(),
      status: "succeeded",
      method: "card",
      raw: session,
    });
  },
};

/** Parse & verify a Stripe webhook. Returns the event or null if invalid. */
export function verifyStripeWebhook(
  body: string,
  signature: string | null
): Stripe.Event | null {
  if (!stripeConfig.webhookSecret || !signature) return null;
  try {
    return stripe().webhooks.constructEvent(
      body,
      signature,
      stripeConfig.webhookSecret
    );
  } catch {
    return null;
  }
}
