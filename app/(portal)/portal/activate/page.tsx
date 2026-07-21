import Link from "next/link";
import { getContactByInviteToken } from "@/lib/auth/wholesale";
import { activateAction } from "./actions";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const contact = token ? await getContactByInviteToken(token) : null;

  if (!contact) {
    return (
      <div className="auth-wrap">
        <div className="card auth-card">
          <div className="brand">Comfort Cross</div>
          <div className="tagline">Activate your account</div>
          <div className="notice error">
            This invitation link is invalid or has expired. Please ask Comfort Cross
            to send you a new one.
          </div>
          <p style={{ textAlign: "center", marginTop: "1rem" }}>
            <Link href="/portal/login">Go to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand">Comfort Cross</div>
        <div className="tagline">
          Welcome, {contact.contactName || contact.companyName} — set your password
        </div>
        {error && <div className="notice error">{error}</div>}
        <form action={activateAction}>
          <input type="hidden" name="token" value={token} />
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={contact.email} readOnly disabled />
          </div>
          <div className="field">
            <label htmlFor="password">Choose a password</label>
            <input id="password" name="password" type="password" minLength={8} required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" name="confirm" type="password" minLength={8} required />
          </div>
          <button className="btn" type="submit" style={{ width: "100%" }}>
            Activate account
          </button>
        </form>
      </div>
    </div>
  );
}
