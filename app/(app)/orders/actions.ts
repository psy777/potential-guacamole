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
  setTracking,
  recordManualPayment,
  deleteOrder,
  getOrder,
  type OrderInput,
  type LineInput,
} from "@/lib/services/orders";
import { ensurePaymentLink, enabledProviders } from "@/lib/services/payments";
import { addOnsByIds } from "@/lib/services/addons";
import { requestSignature } from "@/lib/services/documents/docuseal";
import { renderInvoicePdf } from "@/lib/services/pdf/invoice";
import { getSettings } from "@/lib/services/settings";
import { sendEmail } from "@/lib/services/email";
import type { Order } from "@/lib/db/schema";

async function parseOrder(fd: FormData): Promise<OrderInput> {
  let raw: Array<{
    itemId?: string | null;
    packageId?: string | null;
    description?: string;
    variationName?: string;
    note?: string;
    quantity?: number | string;
    unitPrice?: string;
    addOnIds?: string[];
  }> = [];
  try {
    raw = JSON.parse(String(fd.get("lines") || "[]"));
  } catch {
    raw = [];
  }
  const kept = raw.filter((l) => (l.description ?? "").trim());
  // Resolve all add-on prices in one batch, then attach to each line.
  const allIds = kept.flatMap((l) => (Array.isArray(l.addOnIds) ? l.addOnIds.map(String) : []));
  const priceMap = new Map((await addOnsByIds(allIds)).map((a) => [a.id, a]));
  const lines: LineInput[] = kept.map((l) => {
    const ids = Array.isArray(l.addOnIds) ? l.addOnIds.map(String) : [];
    const addOns = ids
      .map((id) => priceMap.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents }));
    return {
      itemId: l.itemId || null,
      packageId: l.packageId || null,
      description: String(l.description).trim(),
      variationName: String(l.variationName ?? "").trim(),
      note: String(l.note ?? "").trim(),
      quantity: Math.max(1, Number(l.quantity) || 1),
      unitPriceCents: dollarsToCents(l.unitPrice ?? "0"),
      addOns,
    };
  });

  const dueRaw = String(fd.get("dueDate") || "").trim();
  return {
    contactId: String(fd.get("contactId") || "") || null,
    currency: String(fd.get("currency") || "USD").toUpperCase(),
    notes: String(fd.get("notes") || ""),
    title: String(fd.get("title") || "").trim(),
    invoiceId: String(fd.get("invoiceId") || "").trim(),
    invoiceMessage: String(fd.get("invoiceMessage") || "").trim(),
    applyProcessingFee: fd.get("applyProcessingFee") === "on",
    dueDate: dueRaw ? new Date(`${dueRaw}T00:00:00`) : null,
    discountCents: dollarsToCents(String(fd.get("discount") || "0")),
    taxCents: dollarsToCents(String(fd.get("tax") || "0")),
    shippingCents: dollarsToCents(String(fd.get("shipping") || "0")),
    lines,
  };
}

export async function createOrderAction(fd: FormData) {
  const user = await requireUser();
  const id = await createOrder(await parseOrder(fd), user);
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
  await updateOrder(id, await parseOrder(fd));
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

const VALID_STATUSES = ["open", "shipped", "invoiced", "paid", "cancelled"];

export async function setStatusAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  if (!VALID_STATUSES.includes(status)) redirect(`/orders/${id}`);

  await setOrderStatus(id, status as Order["status"], user);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "order.status",
    entityType: "order",
    entityId: id,
    summary: status,
  });
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}?msg=${encodeURIComponent(`Status updated to ${status}.`)}`);
}

export async function syncTrackingAction(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id"));
  try {
    const { syncOrderTracking } = await import("@/lib/services/shipping/ups");
    await syncOrderTracking(id);
  } catch (err) {
    redirect(`/orders/${id}?err=${encodeURIComponent("UPS sync failed: " + (err as Error).message)}`);
  }
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}?msg=${encodeURIComponent("Tracking refreshed from UPS.")}`);
}

export async function setTrackingAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  const tracking = String(fd.get("tracking") || "").trim();
  await setTracking(id, tracking);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "order.tracking",
    entityType: "order",
    entityId: id,
    summary: tracking,
  });
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}?msg=${encodeURIComponent("Tracking saved.")}`);
}

export async function manualPaymentAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  const order = await getOrder(id);
  if (!order) redirect("/orders");
  const amountCents = dollarsToCents(String(fd.get("amount") || "0"));
  const method = String(fd.get("method") || "cash");
  if (amountCents > 0) {
    await recordManualPayment(id, amountCents, method, order.currency);
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

/**
 * Return a payment link that charges the CURRENT outstanding balance, creating
 * or regenerating it as needed. Called by the "Copy payment link" button.
 */
export async function getPaymentLinkAction(
  orderId: string
): Promise<{ url?: string; error?: string }> {
  await requireUser();
  const order = await getOrder(orderId);
  if (!order) return { error: "Order not found." };
  if (!enabledProviders().length) return { error: "No payment provider is configured." };
  const balanceCents = order.totalCents - order.amountPaidCents;
  if (balanceCents <= 0) return { error: "This order is already paid in full." };
  try {
    const url = await ensurePaymentLink(order, order.contact);
    return url ? { url } : { error: "Could not create a payment link." };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function emailInvoiceAction(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id"));
  const order = await getOrder(id);
  if (!order) redirect("/orders");
  if (!order.contact?.email) {
    redirect(`/orders/${id}?err=${encodeURIComponent("This customer has no email address.")}`);
  }
  const settings = await getSettings();
  const fullyPaid =
    order.totalCents > 0 && order.amountPaidCents >= order.totalCents;
  // Make sure there's a hosted payment link (creates one if a provider is set).
  const payUrl = fullyPaid
    ? null
    : await ensurePaymentLink(order, order.contact);
  const pdf = await renderInvoicePdf(order, settings, payUrl ?? undefined);

  const payButton = payUrl
    ? `<p style="margin:20px 0">
         <a href="${payUrl}" style="display:inline-block;background:${settings.brandColor};color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Pay this invoice online</a>
       </p>`
    : "";

  const subject =
    String(fd.get("subject") || "").trim() ||
    `Invoice ${order.number} from ${settings.businessName}`;
  const composed = String(fd.get("body") || "").trim();
  const message =
    composed ||
    `<p>Hi ${order.contact!.contactName || order.contact!.companyName},</p>
     <p>Please find invoice <strong>${order.number}</strong> attached.</p>`;

  const result = await sendEmail({
    to: order.contact!.email,
    subject,
    html: `${message}${payButton}`,
    attachment: { filename: `${order.number}.pdf`, content: pdf },
  });
  if (order.status === "open" || order.status === "shipped") {
    await setOrderStatus(id, "invoiced", { name: "System" }, "Invoice emailed");
  }
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
  const order = await getOrder(id);
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
  await deleteOrder(id);
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
