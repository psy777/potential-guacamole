"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import {
  createUser,
  setUserActive,
  setUserPassword,
  getUserByEmail,
} from "@/lib/auth/users";

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

export async function createUserAction(fd: FormData) {
  const admin = await requireAdmin();
  const name = String(fd.get("name") || "").trim();
  const email = String(fd.get("email") || "").trim();
  const password = String(fd.get("password") || "");
  const role = (String(fd.get("role") || "member") === "admin"
    ? "admin"
    : "member") as "admin" | "member";

  if (!name || !email || password.length < 8) {
    redirect("/users?err=" + encodeURIComponent("Name, email, and an 8+ char password are required."));
  }
  if (await getUserByEmail(email)) {
    redirect("/users?err=" + encodeURIComponent("A user with that email already exists."));
  }

  const user = await createUser({ name, email, password, role });
  await recordAudit({
    userId: admin.id,
    userName: admin.name,
    action: "user.create",
    entityType: "user",
    entityId: user.id,
    summary: `${email} (${role})`,
  });
  revalidatePath("/users");
  redirect("/users?msg=" + encodeURIComponent("User created."));
}

export async function toggleActiveAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  const active = fd.get("active") === "true";
  setUserActive(id, active);
  revalidatePath("/users");
}

export async function resetPasswordAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const password = String(fd.get("password") || "");
  if (password.length < 8) {
    redirect("/users?err=" + encodeURIComponent("Password must be at least 8 characters."));
  }
  await setUserPassword(id, password);
  await recordAudit({
    userId: admin.id,
    userName: admin.name,
    action: "user.reset_password",
    entityType: "user",
    entityId: id,
  });
  revalidatePath("/users");
  redirect("/users?msg=" + encodeURIComponent("Password updated."));
}
