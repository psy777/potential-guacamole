import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";

/**
 * Record an inbound webhook event. Returns false if we've already seen this
 * (provider, eventId) pair — callers should skip processing duplicates.
 */
export function rememberWebhook(
  provider: string,
  eventId: string,
  eventType: string,
  payload: string
): boolean {
  const result = db
    .insert(webhookEvents)
    .values({ provider, eventId, eventType, payload })
    .onConflictDoNothing()
    .run();
  return result.changes > 0;
}
