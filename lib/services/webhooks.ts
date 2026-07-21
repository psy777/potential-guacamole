import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";

/**
 * Record an inbound webhook event. Returns false if we've already seen this
 * (provider, eventId) pair — callers should skip processing duplicates.
 */
export async function rememberWebhook(
  provider: string,
  eventId: string,
  eventType: string,
  payload: string
): Promise<boolean> {
  const inserted = await db
    .insert(webhookEvents)
    .values({ provider, eventId, eventType, payload })
    .onConflictDoNothing()
    .returning();
  return inserted.length > 0;
}
