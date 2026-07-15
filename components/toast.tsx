"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * A temporary notification that fades out on its own (like copy feedback),
 * then strips its message from the URL so a refresh doesn't replay it.
 */
export function Toast({
  message,
  type = "ok",
}: {
  message?: string;
  type?: "ok" | "error";
}) {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    // Remove ?msg / ?err so reloading doesn't show it again.
    window.history.replaceState(null, "", pathname);
    const hide = setTimeout(() => setVisible(false), type === "error" ? 6000 : 3000);
    return () => clearTimeout(hide);
  }, [message, type, pathname]);

  if (!message) return null;
  return (
    <div className={`toast ${type} ${visible ? "in" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
