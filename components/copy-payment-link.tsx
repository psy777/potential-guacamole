"use client";

import { useState } from "react";
import { getPaymentLinkAction } from "@/app/(app)/orders/actions";

/**
 * Copies a payment link for the CURRENT balance. The link is generated on
 * demand server-side (never manually, never stale) and copied to the clipboard.
 */
export function CopyPaymentLink({ orderId }: { orderId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "copied" | "error">("idle");
  const [error, setError] = useState("");

  const onClick = async () => {
    setState("loading");
    setError("");
    const res = await getPaymentLinkAction(orderId);
    if (res.url) {
      try {
        await navigator.clipboard.writeText(res.url);
        setState("copied");
        setTimeout(() => setState("idle"), 2000);
      } catch {
        setState("error");
        setError(`Couldn't copy — link: ${res.url}`);
      }
    } else {
      setState("error");
      setError(res.error || "Failed to get a payment link.");
    }
  };

  return (
    <div>
      <button
        type="button"
        className="btn secondary btn-sm"
        onClick={onClick}
        disabled={state === "loading"}
      >
        {state === "copied" ? "Copied ✓" : state === "loading" ? "Getting link…" : "Copy payment link"}
      </button>
      {state === "error" && (
        <div className="small" style={{ color: "#b3261e", marginTop: "0.4rem" }}>{error}</div>
      )}
    </div>
  );
}
