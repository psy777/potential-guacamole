import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { recomputeOrderPaid } from "@/lib/services/orders";

/**
 * Insert-or-update a payment keyed by (provider, providerPaymentId). This is
 * the idempotency point that lets polling and webhooks run together safely —
 * recording the same provider payment twice is a no-op.
 */
export async function upsertProviderPayment(input: {
  orderId: string;
  provider: "stripe" | "square";
  providerPaymentId: string;
  amountCents: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  method?: string;
  raw?: unknown;
}): Promise<void> {
  await db
    .insert(payments)
    .values({
      orderId: input.orderId,
      provider: input.provider,
      providerPaymentId: input.providerPaymentId,
      amountCents: input.amountCents,
      currency: input.currency,
      status: input.status,
      method: input.method ?? "",
      providerRaw: input.raw ? JSON.stringify(input.raw) : null,
    })
    .onConflictDoUpdate({
      target: [payments.provider, payments.providerPaymentId],
      set: {
        amountCents: input.amountCents,
        status: input.status,
        providerRaw: input.raw ? JSON.stringify(input.raw) : null,
      },
    });

  await recomputeOrderPaid(input.orderId);
}
