"use server";

import { redirect } from "next/navigation";
import { authenticateContact, createContactSession } from "@/lib/auth/wholesale";

export async function portalLoginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const contact = await authenticateContact(email, password);
  if (!contact) redirect("/portal/login?error=1");

  await createContactSession(contact.id);
  redirect("/portal");
}
