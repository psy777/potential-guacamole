"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import {
  createContact,
  updateContact,
  deleteContact,
  type ContactInput,
} from "@/lib/services/contacts";
import {
  setContactPassword,
  setContactPortalEnabled,
  setContactDiscount,
  createPortalInvite,
} from "@/lib/auth/wholesale";
import { getContact } from "@/lib/services/contacts";
import { getSettings } from "@/lib/services/settings";
import { sendEmail } from "@/lib/services/email";
import { APP_URL } from "@/lib/config";

function parse(fd: FormData): ContactInput {
  const s = (k: string) => String(fd.get(k) || "").trim();
  return {
    companyName: s("companyName"),
    contactName: s("contactName"),
    email: s("email"),
    phone: s("phone"),
    billingAddress: s("billingAddress"),
    billingCity: s("billingCity"),
    billingState: s("billingState"),
    billingZip: s("billingZip"),
    billingCountry: s("billingCountry") || "US",
    shippingAddress: s("shippingAddress"),
    shippingCity: s("shippingCity"),
    shippingState: s("shippingState"),
    shippingZip: s("shippingZip"),
    shippingCountry: s("shippingCountry") || "US",
    notes: s("notes"),
  };
}

export async function createContactAction(fd: FormData) {
  const user = await requireUser();
  const input = parse(fd);
  if (!input.companyName) redirect("/contacts/new?error=1");
  const c = await createContact(input);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "contact.create",
    entityType: "contact",
    entityId: c.id,
    summary: c.companyName,
  });
  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function updateContactAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  await updateContact(id, parse(fd));
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "contact.update",
    entityType: "contact",
    entityId: id,
  });
  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function deleteContactAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  await deleteContact(id);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "contact.delete",
    entityType: "contact",
    entityId: id,
  });
  revalidatePath("/contacts");
  redirect("/contacts");
}

// --- Wholesale portal access ---------------------------------------------

export async function setPortalAccessAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  const enabled = fd.get("enabled") === "on";
  await setContactPortalEnabled(id, enabled);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "contact.portal_access",
    entityType: "contact",
    entityId: id,
    summary: enabled ? "enabled" : "disabled",
  });
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}?msg=${encodeURIComponent(enabled ? "Portal access enabled." : "Portal access disabled.")}`);
}

export async function setPortalPasswordAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  const password = String(fd.get("password") || "");
  if (password.length < 8) {
    redirect(`/contacts/${id}?err=${encodeURIComponent("Password must be at least 8 characters.")}`);
  }
  await setContactPassword(id, password);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "contact.portal_password",
    entityType: "contact",
    entityId: id,
  });
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}?msg=${encodeURIComponent("Password set — portal access is now active.")}`);
}

export async function sendPortalInviteAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  const contact = await getContact(id);
  if (!contact) redirect("/contacts");
  if (!contact.email) {
    redirect(`/contacts/${id}?err=${encodeURIComponent("Add an email address before inviting this customer.")}`);
  }

  const { token } = await createPortalInvite(id);
  const activationUrl = `${APP_URL}/portal/activate?token=${token}`;
  const settings = await getSettings();
  const brand = settings.businessName || "Comfort Cross";

  const html = `
    <p>Hi ${contact.contactName || contact.companyName},</p>
    <p>${brand} has set up a wholesale ordering account for you. Click below to
       choose a password and activate your account:</p>
    <p style="margin:22px 0">
      <a href="${activationUrl}" style="display:inline-block;background:#33564b;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Activate your account</a>
    </p>
    <p style="color:#6b7280;font-size:13px">Or paste this link into your browser:<br>${activationUrl}</p>
    <p style="color:#6b7280;font-size:13px">This link expires in 7 days. If you weren't expecting it, you can ignore this email.</p>`;

  const result = await sendEmail({
    to: contact.email,
    subject: `Activate your ${brand} wholesale account`,
    html,
  });

  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "contact.portal_invite",
    entityType: "contact",
    entityId: id,
    summary: result.ok ? "sent" : "email failed",
  });

  revalidatePath(`/contacts/${id}`);
  redirect(
    `/contacts/${id}?${
      result.ok
        ? "msg=" + encodeURIComponent(`Invitation emailed to ${contact.email}.`)
        : "err=" + encodeURIComponent(`Email not sent (${result.error}). Copy the activation link below and send it to the customer.`)
    }`
  );
}

export async function setContactDiscountAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  const raw = String(fd.get("discountPercent") || "").trim();
  const percent = raw === "" ? null : Number(raw);
  await setContactDiscount(id, percent);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "contact.wholesale_discount",
    entityType: "contact",
    entityId: id,
    summary: raw === "" ? "cleared" : `${percent}%`,
  });
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}?msg=${encodeURIComponent("Discount updated.")}`);
}
