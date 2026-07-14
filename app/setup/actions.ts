"use server";

import { redirect } from "next/navigation";
import { userCount, createUser } from "@/lib/auth/users";
import { createSession } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";

export async function setupAction(formData: FormData) {
  if (userCount() > 0) redirect("/login");

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!name || !email || password.length < 8) {
    redirect("/setup?error=1");
  }

  const user = await createUser({ name, email, password, role: "admin" });
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "user.create",
    entityType: "user",
    entityId: user.id,
    summary: "First admin account created",
  });
  await createSession(user.id);
  redirect("/");
}
