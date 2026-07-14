import { POLL_INTERVAL_MS } from "@/lib/config";
import { reconcileOpenPayments } from "@/lib/services/payments";
import { reconcileOpenDocuments } from "@/lib/services/documents/docuseal";

let started = false;

/**
 * Because this app runs locally (no public URL), it can't rely on provider
 * webhooks. Instead a background timer polls Stripe/Square/DocuSeal for status
 * changes. Webhook routes still exist and short-circuit this when reachable.
 */
export function startPoller(): void {
  if (started) return;
  started = true;

  const tick = async () => {
    try {
      await reconcileOpenPayments();
      await reconcileOpenDocuments();
    } catch (err) {
      console.error("[poller] tick failed:", (err as Error).message);
    }
  };

  setInterval(tick, POLL_INTERVAL_MS);
  console.log(
    `[poller] started — reconciling every ${Math.round(
      POLL_INTERVAL_MS / 1000
    )}s`
  );
}
