"use server";

import { redirect } from "next/navigation";
import { activatePortalAccount, createContactSession } from "@/lib/auth/wholesale";

export async function activateAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  const back = `/portal/activate?token=${encodeURIComponent(token)}`;

  if (password.length < 8) {
    redirect(`${back}&error=${encodeURIComponent("Password must be at least 8 characters.")}`);
  }
  if (password !== confirm) {
    redirect(`${back}&error=${encodeURIComponent("Passwords do not match.")}`);
  }

  const contact = await activatePortalAccount(token, password);
  if (!contact) {
    redirect(`${back}&error=${encodeURIComponent("This invitation is invalid or has expired. Ask Comfort Cross to resend it.")}`);
  }

  await createContactSession(contact.id);
  redirect("/portal");
}
