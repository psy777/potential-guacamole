"use client";

import { useState } from "react";

export function CopyableLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — the user can still select the text manually
    }
  };

  return (
    <div className="actions" style={{ marginTop: "0.4rem" }}>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        style={{ flex: 1 }}
      />
      <button type="button" className="btn secondary btn-sm" onClick={copy}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
