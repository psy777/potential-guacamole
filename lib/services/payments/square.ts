import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, type Order } from "@/lib/db/schema";
import { square as squareConfig, APP_URL } from "@/lib/config";
import type { PaymentProvider, PaymentLink } from "./types";
import { upsertProviderPayment } from "./upsert";

const SQUARE_VERSION = "2025-01-23";

async function squareFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${squareConfig.apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${squareConfig.accessToken}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Square API ${path} failed: ${JSON.stringify(json.errors ?? json)}`
    );
  }
  return json;
}

export const squareProvider: PaymentProvider = {
  id: "square",

  isConfigured() {
    return squareConfig.isConfigured;
  },

  async createPaymentLink(order: Order): Promise<PaymentLink> {
    const json = await squareFetch("/v2/online-checkout/payment-links", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: `link-${order.id}`,
        quick_pay: {
          name: `Order ${order.number}`,
          price_money: {
            amount: order.totalCents,
            currency: order.currency,
          },
          location_id: squareConfig.locationId,
        },
        checkout_options: {
          redirect_url: `${APP_URL}/orders/${order.id}?paid=1`,
        },
      }),
    });

    const link = json.payment_link;
    db.update(orders)
      .set({
        squarePaymentLinkId: link.id,
        squareOrderId: link.order_id ?? null,
      })
      .where(eq(orders.id, order.id))
      .run();

    return { url: link.url, providerRef: link.id };
  },

  async syncOrder(order: Order): Promise<void> {
    if (!order.squareOrderId) return;
    const json = await squareFetch(`/v2/orders/${order.squareOrderId}`);
    const sqOrder = json.order;
    const tenders: Array<{ id: string; amount_money?: { amount: number } }> =
      sqOrder?.tenders ?? [];
    if (!tenders.length) return;

    // Each tender is a captured payment against the order.
    for (const tender of tenders) {
      upsertProviderPayment({
        orderId: order.id,
        provider: "square",
        providerPaymentId: tender.id,
        amountCents: tender.amount_money?.amount ?? 0,
        currency: order.currency,
        status: "succeeded",
        method: "square",
        raw: tender,
      });
    }
  },
};

/** Verify a Square webhook signature (HMAC-SHA256 of URL + body). */
export function verifySquareWebhook(
  body: string,
  signature: string | null,
  notificationUrl: string
): boolean {
  if (!squareConfig.webhookSignatureKey || !signature) return false;
  const hmac = crypto.createHmac(
    "sha256",
    squareConfig.webhookSignatureKey
  );
  hmac.update(notificationUrl + body);
  const expected = hmac.digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}
