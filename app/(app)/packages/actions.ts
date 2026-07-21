"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import {
  createPackage,
  updatePackage,
  deletePackage,
  type PackageInput,
  type PackageMemberInput,
} from "@/lib/services/packages";

function parseMembers(fd: FormData): PackageMemberInput[] {
  try {
    const raw = JSON.parse(String(fd.get("members") || "[]")) as {
      itemId?: string;
      quantity?: number;
    }[];
    return raw
      .filter((m) => m.itemId)
      .map((m) => ({
        itemId: String(m.itemId),
        quantity: Math.max(1, Number(m.quantity) || 1),
      }));
  } catch {
    return [];
  }
}

function parse(fd: FormData): PackageInput {
  return {
    name: String(fd.get("name") || "").trim(),
    description: String(fd.get("description") || "").trim(),
    active: fd.get("active") === "on",
    members: parseMembers(fd),
  };
}

export async function createPackageAction(fd: FormData) {
  const user = await requireUser();
  const input = parse(fd);
  if (!input.name) redirect("/packages/new?error=1");
  const pkg = await createPackage(input);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "package.create",
    entityType: "package",
    entityId: pkg.id,
    summary: pkg.name,
  });
  revalidatePath("/packages");
  redirect("/packages");
}

export async function updatePackageAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  await updatePackage(id, parse(fd));
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "package.update",
    entityType: "package",
    entityId: id,
  });
  revalidatePath("/packages");
  redirect("/packages");
}

export async function deletePackageAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  deletePackage(id);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "package.delete",
    entityType: "package",
    entityId: id,
  });
  revalidatePath("/packages");
  redirect("/packages");
}
