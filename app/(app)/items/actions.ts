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
  type ItemVariationInput,
} from "@/lib/services/items";

function parseVariations(fd: FormData): ItemVariationInput[] {
  try {
    const raw = JSON.parse(String(fd.get("variations") || "[]")) as Array<{
      name?: string;
      sku?: string;
      gtin?: string;
      price?: string;
    }>;
    return raw.map((v) => ({
      name: String(v.name || "").trim(),
      sku: String(v.sku || "").trim(),
      gtin: String(v.gtin || "").trim(),
      priceCents: dollarsToCents(v.price ?? "0"),
    }));
  } catch {
    return [];
  }
}

function parse(fd: FormData): ItemInput {
  return {
    name: String(fd.get("name") || "").trim(),
    description: String(fd.get("description") || "").trim(),
    category: String(fd.get("category") || "").trim(),
    currency: String(fd.get("currency") || "USD").toUpperCase(),
    active: fd.get("active") === "on",
    variations: parseVariations(fd),
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
