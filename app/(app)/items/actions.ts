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
import { importSquareCatalog } from "@/lib/services/square-catalog";
import { square as squareConfig } from "@/lib/config";

function parseVariations(fd: FormData): ItemVariationInput[] {
  try {
    const raw = JSON.parse(String(fd.get("variations") || "[]")) as Array<{
      id?: string | null;
      name?: string;
      sku?: string;
      gtin?: string;
      price?: string;
      wholesale?: string;
      imagePath?: string;
    }>;
    return raw.map((v) => ({
      id: v.id || null,
      name: String(v.name || "").trim(),
      sku: String(v.sku || "").trim(),
      gtin: String(v.gtin || "").trim(),
      priceCents: dollarsToCents(v.price ?? "0"),
      wholesalePriceCents:
        v.wholesale && String(v.wholesale).trim() ? dollarsToCents(v.wholesale) : null,
      imagePath: String(v.imagePath || ""),
    }));
  } catch {
    return [];
  }
}

function parseAddOnIds(fd: FormData): string[] {
  try {
    const raw = JSON.parse(String(fd.get("addOnIds") || "[]"));
    return Array.isArray(raw) ? raw.map(String) : [];
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
    imagePath: String(fd.get("imagePath") || ""),
    variations: parseVariations(fd),
    addOnIds: parseAddOnIds(fd),
  };
}

export async function createItemAction(fd: FormData) {
  const user = await requireUser();
  const input = parse(fd);
  if (!input.name) redirect("/items/new?error=1");
  const item = await createItem(input);
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
  await updateItem(id, parse(fd));
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
  await deleteItem(id);
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

export async function bulkCreateItemsAction(fd: FormData) {
  const user = await requireUser();
  const lines = String(fd.get("bulk") || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let created = 0;
  for (const line of lines) {
    const [namePart, pricePart, catPart] = line.split(",").map((s) => (s ?? "").trim());
    if (!namePart) continue;
    await createItem({
      name: namePart,
      description: "",
      category: catPart || "",
      currency: "USD",
      active: true,
      imagePath: "",
      variations: [
        { name: "Regular", sku: "", gtin: "", priceCents: dollarsToCents(pricePart || "0"), wholesalePriceCents: null, imagePath: "" },
      ],
      addOnIds: [],
    });
    created += 1;
  }

  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "item.bulk_create",
    entityType: "item",
    summary: `${created} items`,
  });
  revalidatePath("/items");
  redirect(`/items?msg=${encodeURIComponent(`Created ${created} item(s).`)}`);
}

export async function importSquareCatalogAction() {
  const user = await requireUser();
  if (!squareConfig.isConfigured) {
    redirect("/items?err=" + encodeURIComponent("Square is not configured."));
  }
  let result: { created: number; updated: number };
  try {
    result = await importSquareCatalog();
  } catch (err) {
    redirect(
      "/items?err=" +
        encodeURIComponent("Square import failed: " + (err as Error).message)
    );
  }
  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "item.import_square",
    entityType: "item",
    summary: `${result.created} created, ${result.updated} updated`,
  });
  revalidatePath("/items");
  redirect(
    "/items?msg=" +
      encodeURIComponent(
        `Imported ${result.created} new item(s) and updated ${result.updated} from Square.`
      )
  );
}
