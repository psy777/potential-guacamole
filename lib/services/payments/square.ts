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

  async createPaymentLink(
    order: Order,
    _contact,
    amountCents: number,
    successPath?: string
  ): Promise<PaymentLink> {
    const json = await squareFetch("/v2/online-checkout/payment-links", {
      method: "POST",
      body: JSON.stringify({
        // Amount AND return path are in the key: a changed balance or a different
        // return destination (Studio vs portal) mints a distinct link, so each
        // context sends the payer back to the right place.
        idempotency_key: `link-${order.id}-${amountCents}${
          successPath ? "-" + Buffer.from(successPath).toString("base64url").slice(0, 16) : ""
        }`,
        quick_pay: {
          name: `Order ${order.number}`,
          price_money: {
            amount: amountCents,
            currency: order.currency,
          },
          location_id: squareConfig.locationId,
        },
        checkout_options: {
          // Default (customer-facing) links return to the public thank-you page;
          // the portal passes its own path to return there instead.
          redirect_url: `${APP_URL}${successPath ?? `/pay/thanks?order=${encodeURIComponent(order.number)}`}`,
        },
      }),
    });

    const link = json.payment_link;
    await db
      .update(orders)
      .set({
        squarePaymentLinkId: link.id,
        squareOrderId: link.order_id ?? null,
        paymentLinkUrl: link.url,
        paymentLinkProvider: "square",
        paymentLinkAmountCents: amountCents,
      })
      .where(eq(orders.id, order.id));

    return { url: link.url, providerRef: link.id };
  },

  async syncOrder(order: Order): Promise<void> {
    if (!order.squareOrderId) return;
    const json = await squareFetch(`/v2/orders/${order.squareOrderId}`);
    const sqOrder = json.order;
    const tenders: Array<{
      id: string;
      payment_id?: string;
      amount_money?: { amount: number };
    }> = sqOrder?.tenders ?? [];
    if (!tenders.length) return;

    let actualFeeCents = 0;
    for (const tender of tenders) {
      await upsertProviderPayment({
        orderId: order.id,
        provider: "square",
        providerPaymentId: tender.id,
        amountCents: tender.amount_money?.amount ?? 0,
        currency: order.currency,
        status: "succeeded",
        method: "square",
        raw: tender,
      });

      // Read the ACTUAL processing fee Square charged on this payment.
      const paymentId = tender.payment_id ?? tender.id;
      try {
        const pj = await squareFetch(`/v2/payments/${paymentId}`);
        const fees: Array<{ amount_money?: { amount: number } }> =
          pj?.payment?.processing_fee ?? [];
        actualFeeCents += fees.reduce(
          (s, f) => s + Number(f.amount_money?.amount ?? 0),
          0
        );
      } catch {
        // Fee may not be computed yet; a later poll will pick it up.
      }
    }

    if (actualFeeCents > 0) {
      await db
        .update(orders)
        .set({ squareProcessingFeeCents: actualFeeCents })
        .where(eq(orders.id, order.id));
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
