"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { dollarsToCents } from "@/lib/money";
import {
  createOrder,
  updateOrder,
  setOrderStatus,
  recordManualPayment,
  deleteOrder,
  getOrder,
  type OrderInput,
  type LineInput,
} from "@/lib/services/orders";
import { getProvider } from "@/lib/services/payments";
import { requestSignature } from "@/lib/services/documents/docuseal";
import { renderInvoicePdf } from "@/lib/services/pdf/invoice";
import { getSettings } from "@/lib/services/settings";
import { sendEmail } from "@/lib/services/email";
import type { Order } from "@/lib/db/schema";

function parseOrder(fd: FormData): OrderInput {
  let lines: LineInput[] = [];
  try {
    const raw = JSON.parse(String(fd.get("lines") || "[]")) as Array<{
      itemId?: string | null;
      packageId?: string | null;
      description?: string;
      quantity?: number | string;
      unitPrice?: string;
    }>;
    lines = raw
      .filter((l) => (l.description ?? "").trim())
      .map((l) => ({
        itemId: l.itemId || null,
        packageId: l.packageId || null,
        description: String(l.description).trim(),
        quantity: Math.max(1, Number(l.quantity) || 1),
        unitPriceCents: dollarsToCents(l.unitPrice ?? "0"),
      }));
  } catch {
    lines = [];
  }

  return {
    contactId: String(fd.get("contactId") || "") || null,
    currency: String(fd.get("currency") || "USD").toUpperCase(),
    notes: String(fd.get("notes") || ""),
    discountCents: dollarsToCents(String(fd.get("discount") || "0")),
    taxCents: dollarsToCents(String(fd.get("tax") || "0")),
    shippingCents: dollarsToCents(String(fd.get("shipping") || "0")),
    lines,
  };
}

export async function createOrderAction(fd: FormData) {
  const user = await requireUser();
  const id = createOrder(parseOrder(fd), user);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "order.create",
    entityType: "order",
    entityId: id,
  });
  revalidatePath("/orders");
  redirect(`/orders/${id}`);
}

export async function updateOrderAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  updateOrder(id, parseOrder(fd));
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "order.update",
    entityType: "order",
    entityId: id,
  });
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}`);
}

export async function setStatusAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  const status = String(fd.get("status")) as Order["status"];
  setOrderStatus(id, status, user);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "order.status",
    entityType: "order",
    entityId: id,
    summary: status,
  });
  revalidatePath(`/orders/${id}`);
}

export async function manualPaymentAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  const order = getOrder(id);
  if (!order) redirect("/orders");
  const amountCents = dollarsToCents(String(fd.get("amount") || "0"));
  const method = String(fd.get("method") || "cash");
  if (amountCents > 0) {
    recordManualPayment(id, amountCents, method, order.currency);
    await recordAudit({
      userId: user.id,
      userName: user.name,
      action: "payment.manual",
      entityType: "order",
      entityId: id,
      summary: `${method} ${amountCents}c`,
    });
  }
  revalidatePath(`/orders/${id}`);
}

export async function paymentLinkAction(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id"));
  const providerId = String(fd.get("provider"));
  const order = getOrder(id);
  const provider = getProvider(providerId);
  if (!order || !provider) redirect(`/orders/${id}`);
  try {
    const { url } = await provider!.createPaymentLink(order!, order!.contact);
    revalidatePath(`/orders/${id}`);
    redirect(`/orders/${id}?link=${encodeURIComponent(url)}`);
  } catch (err) {
    redirect(
      `/orders/${id}?err=${encodeURIComponent(
        `${providerId} link failed: ${(err as Error).message}`
      )}`
    );
  }
}

export async function emailInvoiceAction(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id"));
  const order = getOrder(id);
  if (!order) redirect("/orders");
  if (!order.contact?.email) {
    redirect(`/orders/${id}?err=${encodeURIComponent("This customer has no email address.")}`);
  }
  const settings = getSettings();
  const pdf = await renderInvoicePdf(order, settings);
  const result = await sendEmail({
    to: order.contact!.email,
    subject: `Invoice ${order.number} from ${settings.businessName}`,
    html: `<p>Hi ${order.contact!.contactName || order.contact!.companyName},</p>
           <p>Please find invoice <strong>${order.number}</strong> attached.</p>
           <p>${settings.invoiceFooter}</p>`,
    attachment: { filename: `${order.number}.pdf`, content: pdf },
  });
  if (order.status === "draft") setOrderStatus(id, "sent", { name: "System" }, "Invoice emailed");
  revalidatePath(`/orders/${id}`);
  redirect(
    `/orders/${id}?${
      result.ok
        ? "msg=" + encodeURIComponent("Invoice emailed.")
        : "err=" + encodeURIComponent(result.error || "Email failed.")
    }`
  );
}

export async function requestSignatureAction(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id"));
  const order = getOrder(id);
  if (!order) redirect("/orders");
  const signerEmail =
    String(fd.get("signerEmail") || "").trim() || order.contact?.email || "";
  if (!signerEmail) {
    redirect(`/orders/${id}?err=${encodeURIComponent("A signer email is required.")}`);
  }
  const result = await requestSignature(order, order.contact, signerEmail);
  revalidatePath(`/orders/${id}`);
  redirect(
    `/orders/${id}?${
      result.ok
        ? "msg=" + encodeURIComponent("Signature request sent.")
        : "err=" + encodeURIComponent(result.error || "Signature request failed.")
    }`
  );
}

export async function deleteOrderAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  deleteOrder(id);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "order.delete",
    entityType: "order",
    entityId: id,
  });
  revalidatePath("/orders");
  redirect("/orders");
}
