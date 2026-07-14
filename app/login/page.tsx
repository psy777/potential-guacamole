import { redirect } from "next/navigation";
import { userCount } from "@/lib/auth/users";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (userCount() === 0) redirect("/setup");
  const { error, next } = await searchParams;

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand">🔥 FireCoast</div>
        <div className="tagline">Sign in to your account</div>
        {error && (
          <div className="notice error">Incorrect email or password.</div>
        )}
        <form action={loginAction}>
          <input type="hidden" name="next" value={next ?? "/"} />
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
      </div>
    </div>
  );
}
