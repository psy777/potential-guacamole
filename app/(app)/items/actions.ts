"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { dollarsToCents } from "@/lib/money";
import {
  createItem,
  updateItem,
  deleteItem,
  type ItemInput,
} from "@/lib/services/items";

function parse(fd: FormData): ItemInput {
  return {
    name: String(fd.get("name") || "").trim(),
    description: String(fd.get("description") || "").trim(),
    sku: String(fd.get("sku") || "").trim(),
    priceCents: dollarsToCents(String(fd.get("price") || "0")),
    currency: String(fd.get("currency") || "USD"),
    active: fd.get("active") === "on",
  };
}

export async function createItemAction(fd: FormData) {
  const user = await requireUser();
  const input = parse(fd);
  if (!input.name) redirect("/items/new?error=1");
  const item = createItem(input);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "item.create",
    entityType: "item",
    entityId: item.id,
    summary: item.name,
  });
  revalidatePath("/items");
  redirect("/items");
}

export async function updateItemAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  updateItem(id, parse(fd));
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "item.update",
    entityType: "item",
    entityId: id,
  });
  revalidatePath("/items");
  redirect("/items");
}

export async function deleteItemAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  deleteItem(id);
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "item.delete",
    entityType: "item",
    entityId: id,
  });
  revalidatePath("/items");
  redirect("/items");
}
