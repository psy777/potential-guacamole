import Link from "next/link";

export default function NotFound() {
  return (
    <div className="auth-wrap">
      <div className="card auth-card" style={{ textAlign: "center" }}>
        <div className="brand">🔥 FireCoast</div>
        <p className="muted">That page doesn&apos;t exist.</p>
        <Link href="/" className="btn">Back to dashboard</Link>
      </div>
    </div>
  );
}
