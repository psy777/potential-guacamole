"use server";

import { redirect } from "next/navigation";
import { getUserByEmail } from "@/lib/auth/users";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  const user = getUserByEmail(email);
  const ok =
    user && user.active && (await verifyPassword(password, user.passwordHash));

  if (!user || !ok) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  await createSession(user.id);
  redirect(next.startsWith("/") ? next : "/");
}
