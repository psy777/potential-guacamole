import type { Order, Contact } from "@/lib/db/schema";

export type PaymentLink = { url: string; providerRef: string };

/**
 * Every payment provider implements this small interface. Adding a new
 * processor means writing one file that satisfies this — nothing else changes.
 */
export interface PaymentProvider {
  readonly id: "stripe" | "square";
  isConfigured(): boolean;
  /** Create a hosted checkout/payment link charging `amountCents` (the balance). */
  createPaymentLink(
    order: Order,
    contact: Contact | null,
    amountCents: number
  ): Promise<PaymentLink>;
  /** Poll the provider and record any payments found against this order. */
  syncOrder(order: Order): Promise<void>;
}
