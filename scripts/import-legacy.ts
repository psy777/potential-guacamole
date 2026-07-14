/**
 * Best-effort importer from the OLD FireCoast (Flask) SQLite database into the
 * new schema. It reads the legacy `orders_manager.db`, converts money to
 * integer cents, and inserts contacts, items, and orders.
 *
 * Usage: npm run import:legacy -- /path/to/old/data/orders_manager.db
 *
 * It is deliberately defensive (legacy columns varied over time) and logs what
 * it did. Review the results afterward — this is a migration aid, not a
 * guaranteed 1:1 copy.
 */
import Database from "better-sqlite3";
import { runMigrations } from "@/lib/db/migrate";
import { db } from "@/lib/db";
import { contacts, items, orders, orderLineItems } from "@/lib/db/schema";

const legacyPath = process.argv[2];
if (!legacyPath) {
  console.error("Usage: npm run import:legacy -- /path/to/orders_manager.db");
  process.exit(1);
}

runMigrations();
const legacy = new Database(legacyPath, { readonly: true });

function tables(): Set<string> {
  const rows = legacy
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}
function columns(table: string): Set<string> {
  try {
    const rows = legacy.prepare(`PRAGMA table_info(${table})`).all() as {
      name: string;
    }[];
    return new Set(rows.map((r) => r.name));
  } catch {
    return new Set();
  }
}
const present = tables();
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
/** Legacy money may be float dollars OR integer cents — normalize to cents. */
function toCents(dollarsCol: unknown, centsCol: unknown): number {
  if (centsCol !== undefined && centsCol !== null) return Math.round(num(centsCol));
  return Math.round(num(dollarsCol) * 100);
}

// --- Contacts (legacy: "contacts" or "vendors") --------------------------
const contactTable = present.has("contacts")
  ? "contacts"
  : present.has("vendors")
  ? "vendors"
  : null;
const contactIdMap = new Map<string, string>();
let contactCount = 0;
if (contactTable) {
  const rows = legacy.prepare(`SELECT * FROM ${contactTable}`).all() as Record<
    string,
    unknown
  >[];
  for (const r of rows) {
    const inserted = db
      .insert(contacts)
      .values({
        companyName: String(r.company_name || r.name || r.contact_name || "Unnamed"),
        contactName: String(r.contact_name || ""),
        email: String(r.email || ""),
        phone: String(r.phone || ""),
        billingAddress: String(r.billing_address || r.address || ""),
        billingCity: String(r.billing_city || r.city || ""),
        billingState: String(r.billing_state || r.state || ""),
        billingZip: String(r.billing_zip || r.zip_code || ""),
        notes: String(r.notes || ""),
      })
      .returning()
      .get();
    if (r.id) contactIdMap.set(String(r.id), inserted.id);
    contactCount++;
  }
}
console.log(`Imported ${contactCount} contacts.`);

// --- Items ---------------------------------------------------------------
let itemCount = 0;
if (present.has("items")) {
  const cols = columns("items");
  const rows = legacy.prepare("SELECT * FROM items").all() as Record<
    string,
    unknown
  >[];
  for (const r of rows) {
    db.insert(items)
      .values({
        name: String(r.name || "Item"),
        description: String(r.description || ""),
        sku: String(r.sku || r.barcode || ""),
        priceCents: toCents(r.price, cols.has("price_cents") ? r.price_cents : undefined),
      })
      .run();
    itemCount++;
  }
}
console.log(`Imported ${itemCount} items.`);

// --- Orders + line items -------------------------------------------------
let orderCount = 0;
if (present.has("orders")) {
  const ocols = columns("orders");
  const orderRows = legacy.prepare("SELECT * FROM orders").all() as Record<
    string,
    unknown
  >[];
  const hasLines = present.has("order_line_items");
  const lcols = hasLines ? columns("order_line_items") : new Set<string>();

  for (const r of orderRows) {
    const legacyContactId = String(r.contact_id || r.vendor_id || "");
    const totalCents = toCents(
      r.total_amount,
      ocols.has("total_cents") ? r.total_cents : undefined
    );
    const taxCents = toCents(r.tax_amount, undefined);
    const shippingCents = toCents(r.estimated_shipping_cost, undefined);
    const discountCents = toCents(r.discount_total, undefined);

    const inserted = db
      .insert(orders)
      .values({
        number: String(r.id || r.order_number || `ORD-${orderCount + 1}`),
        contactId: contactIdMap.get(legacyContactId) ?? null,
        status: normalizeStatus(String(r.status || "draft")),
        currency: "USD",
        taxCents,
        shippingCents,
        discountCents,
        totalCents,
        notes: String(r.notes || ""),
      })
      .returning()
      .get();

    if (hasLines) {
      const lines = legacy
        .prepare("SELECT * FROM order_line_items WHERE order_id = ?")
        .all(r.id) as Record<string, unknown>[];
      lines.forEach((l, i) => {
        const unit = toCents(
          l.price_per_unit,
          lcols.has("price_per_unit_cents") ? l.price_per_unit_cents : undefined
        );
        const qty = Math.max(1, Math.round(num(l.quantity)) || 1);
        db.insert(orderLineItems)
          .values({
            orderId: inserted.id,
            description: String(l.description || l.name || "Item"),
            quantity: qty,
            unitPriceCents: unit,
            lineTotalCents: unit * qty,
            position: i,
          })
          .run();
      });
    }
    orderCount++;
  }
}
console.log(`Imported ${orderCount} orders.`);
console.log("Done. Review the imported data in the app.");

function normalizeStatus(
  s: string
): "draft" | "sent" | "paid" | "shipped" | "cancelled" {
  const v = s.toLowerCase();
  if (["draft", "sent", "paid", "shipped", "cancelled"].includes(v)) {
    return v as "draft" | "sent" | "paid" | "shipped" | "cancelled";
  }
  if (v.includes("paid")) return "paid";
  if (v.includes("ship")) return "shipped";
  if (v.includes("cancel")) return "cancelled";
  if (v.includes("sent")) return "sent";
  return "draft";
}
