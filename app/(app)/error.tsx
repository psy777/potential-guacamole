"use client";

// Catches unexpected errors anywhere in the Studio so a failure shows a
// friendly message (with a reference code that maps to the server logs)
// instead of a raw crash.
export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card" style={{ maxWidth: 520, margin: "3rem auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.15rem", marginTop: 0 }}>Something went wrong</h1>
      <p className="muted">
        An unexpected error occurred. Try again — if it keeps happening, share the
        reference code below.
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
        <a href="/" className="btn secondary">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
