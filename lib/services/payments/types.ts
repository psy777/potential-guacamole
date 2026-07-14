import type { Order, Contact } from "@/lib/db/schema";

export type PaymentLink = { url: string; providerRef: string };

/**
 * Every payment provider implements this small interface. Adding a new
 * processor means writing one file that satisfies this — nothing else changes.
 */
export interface PaymentProvider {
  readonly id: "stripe" | "square";
  isConfigured(): boolean;
  /** Create a hosted checkout/payment link for an order. */
  createPaymentLink(order: Order, contact: Contact | null): Promise<PaymentLink>;
  /** Poll the provider and record any payments found against this order. */
  syncOrder(order: Order): Promise<void>;
}
