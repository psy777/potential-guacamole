import { getSettings } from "@/lib/services/settings";

export default async function PaymentThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; status?: string }>;
}) {
  const { order, status } = await searchParams;
  const settings = await getSettings();
  const cancelled = status === "cancelled";

  return (
    <div className="auth-wrap">
      <div className="card auth-card" style={{ textAlign: "center" }}>
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            margin: "0 auto 0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.6rem",
            color: "#fff",
            background: cancelled ? "#b7791f" : "#2e7d32",
          }}
        >
          {cancelled ? "↺" : "✓"}
        </div>
        <h1 style={{ fontSize: "1.35rem", margin: "0 0 0.35rem" }}>
          {cancelled ? "Payment cancelled" : "Payment received"}
        </h1>
        <p className="muted">
          {cancelled ? (
            <>Your payment wasn&apos;t completed. You can try again from your invoice.</>
          ) : (
            <>
              Thank you! {settings.businessName} has received your payment
              {order ? <> for order <strong>{order}</strong></> : null}.
            </>
          )}
        </p>
        <p className="muted small" style={{ marginTop: "1rem" }}>
          You can safely close this window.
        </p>
      </div>
    </div>
  );
}
