import { and, eq, isNotNull, or, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, type Order, type Contact } from "@/lib/db/schema";
import { stripeProvider } from "./stripe";
import { squareProvider } from "./square";
import type { PaymentProvider } from "./types";

export const providers: Record<string, PaymentProvider> = {
  stripe: stripeProvider,
  square: squareProvider,
};

export function getProvider(id: string): PaymentProvider | undefined {
  return providers[id];
}

export function enabledProviders(): PaymentProvider[] {
  return Object.values(providers).filter((p) => p.isConfigured());
}

/**
 * Return the order's existing payment-link URL, or create one with the first
 * enabled provider. Returns null if no provider is configured or the order has
 * nothing to charge. Used to embed a "Pay online" link in emails/invoices.
 */
export async function ensurePaymentLink(
  order: Order,
  contact: Contact | null
): Promise<string | null> {
  if (order.paymentLinkUrl) return order.paymentLinkUrl;
  if (order.totalCents <= 0) return null;
  const provider = enabledProviders()[0];
  if (!provider) return null;
  try {
    const { url } = await provider.createPaymentLink(order, contact);
    return url || null;
  } catch (err) {
    console.error("[ensurePaymentLink]", (err as Error).message);
    return null;
  }
}

/**
 * Poll every provider for every order that has an open payment link and is not
 * yet fully paid. Called by the background poller and by webhooks as a refresh.
 */
export async function reconcileOpenPayments(): Promise<void> {
  if (!enabledProviders().length) return;

  const openOrders = db
    .select()
    .from(orders)
    .where(
      and(
        or(
          isNotNull(orders.stripeCheckoutId),
          isNotNull(orders.squareOrderId)
        ),
        ne(orders.status, "cancelled")
      )
    )
    .all()
    .filter((o) => o.amountPaidCents < o.totalCents);

  for (const order of openOrders) {
    for (const provider of enabledProviders()) {
      try {
        await provider.syncOrder(order);
      } catch (err) {
        console.error(
          `[reconcile] ${provider.id} failed for order ${order.number}:`,
          (err as Error).message
        );
      }
    }
  }
}

export async function reconcileOrder(orderId: string): Promise<void> {
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) return;
  for (const provider of enabledProviders()) {
    try {
      await provider.syncOrder(order);
    } catch (err) {
      console.error(`[reconcile] ${provider.id}:`, (err as Error).message);
    }
  }
}
