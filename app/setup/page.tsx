import { redirect } from "next/navigation";
import { userCount } from "@/lib/auth/users";
import { setupAction } from "./actions";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if ((await userCount()) > 0) redirect("/login");
  const { error } = await searchParams;

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand">🔥 FireCoast</div>
        <div className="tagline">Create your admin account to get started</div>
        {error && (
          <div className="notice error">
            Please provide a name, email, and a password of at least 8 characters.
          </div>
        )}
        <form action={setupAction}>
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" name="name" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password (min 8 characters)</label>
            <input id="password" name="password" type="password" required minLength={8} />
          </div>
          <button className="btn" type="submit" style={{ width: "100%" }}>
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}
