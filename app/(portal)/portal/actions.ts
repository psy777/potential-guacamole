"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireContact, destroyContactSession } from "@/lib/auth/wholesale";
import {
  addToCart,
  setCartQuantity,
  removeCartItem,
  clearCart,
  placeOrder,
  reorderIntoCart,
} from "@/lib/services/wholesale";

export async function addToCartAction(fd: FormData) {
  const contact = await requireContact();
  const itemId = String(fd.get("itemId") || "");
  const variationId = String(fd.get("variationId") || "");
  const quantity = Math.max(1, Number(fd.get("quantity")) || 1);
  if (itemId && variationId) {
    await addToCart(contact.id, itemId, variationId, quantity);
  }
  revalidatePath("/portal/catalog");
  revalidatePath("/portal/cart");
}

export async function setQtyAction(fd: FormData) {
  const contact = await requireContact();
  const cartItemId = String(fd.get("cartItemId") || "");
  const quantity = Number(fd.get("quantity")) || 0;
  if (cartItemId) await setCartQuantity(contact.id, cartItemId, quantity);
  revalidatePath("/portal/cart");
}

export async function removeItemAction(fd: FormData) {
  const contact = await requireContact();
  const cartItemId = String(fd.get("cartItemId") || "");
  if (cartItemId) await removeCartItem(contact.id, cartItemId);
  revalidatePath("/portal/cart");
}

export async function clearCartAction() {
  const contact = await requireContact();
  await clearCart(contact.id);
  revalidatePath("/portal/cart");
}

export async function placeOrderAction() {
  const contact = await requireContact();
  const orderId = await placeOrder(contact);
  if (!orderId) redirect("/portal/cart?err=empty");
  revalidatePath("/portal/orders");
  redirect(`/portal/orders/${orderId}?placed=1`);
}

export async function reorderAction(fd: FormData) {
  const contact = await requireContact();
  const orderId = String(fd.get("orderId") || "");
  const { added, skipped } = await reorderIntoCart(contact.id, orderId);
  revalidatePath("/portal/cart");
  redirect(`/portal/cart?added=${added}&skipped=${skipped}`);
}

export async function portalLogoutAction() {
  await destroyContactSession();
  redirect("/portal/login");
}
