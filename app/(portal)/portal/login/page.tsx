import { redirect } from "next/navigation";
import { getCurrentContact } from "@/lib/auth/wholesale";
import { portalLoginAction } from "./actions";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentContact()) redirect("/portal");
  const { error } = await searchParams;

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand">Comfort Cross</div>
        <div className="tagline">Wholesale ordering portal</div>
        {error && <div className="notice error">Incorrect email or password.</div>}
        <form action={portalLoginAction}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required />
          </div>
          <button className="btn" type="submit" style={{ width: "100%" }}>
            Sign in
          </button>
        </form>
        <p className="muted small" style={{ textAlign: "center", marginTop: "1rem" }}>
          Accounts are by invitation. Check your email for an invitation from
          Comfort Cross to activate yours.
        </p>
      </div>
    </div>
  );
}
