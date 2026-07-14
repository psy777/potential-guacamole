"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { updateSettings } from "@/lib/services/settings";
import { recordAudit } from "@/lib/audit";

export async function updateSettingsAction(fd: FormData) {
  const user = await requireUser();
  const s = (k: string) => String(fd.get(k) || "").trim();
  updateSettings({
    businessName: s("businessName") || "My Business",
    businessEmail: s("businessEmail"),
    businessPhone: s("businessPhone"),
    businessAddress: s("businessAddress"),
    invoiceFooter: s("invoiceFooter"),
    brandColor: s("brandColor") || "#c0392b",
    defaultCurrency: (s("defaultCurrency") || "USD").toUpperCase(),
  });
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "settings.update",
    entityType: "settings",
  });
  revalidatePath("/settings");
  redirect("/settings?msg=Saved");
}
