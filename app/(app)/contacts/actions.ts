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
  const c = createContact(input);
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
  updateContact(id, parse(fd));
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
  deleteContact(id);
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
