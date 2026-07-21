"use client";

// Friendly error fallback for the wholesale portal.
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card" style={{ maxWidth: 480, margin: "3rem auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.1rem", marginTop: 0 }}>Something went wrong</h1>
      <p className="muted">
        Sorry — please try again. If it keeps happening, contact Comfort Cross with
        the reference code below.
      </p>
      {error.digest && (
        <p className="muted small">
          Reference: <code>{error.digest}</code>
        </p>
      )}
      <div className="actions" style={{ justifyContent: "center", marginTop: "0.75rem" }}>
        <button className="btn" onClick={reset}>
          Try again
        </button>
        <a href="/portal" className="btn secondary">
          Back to portal
        </a>
      </div>
    </div>
  );
}
