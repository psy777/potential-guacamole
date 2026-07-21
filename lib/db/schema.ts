// The single source of truth for the database shape (PostgreSQL).
// Money is ALWAYS stored as integer cents + an explicit currency. Never floats.
import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

const createdAt = () =>
  timestamp("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  timestamp("updated_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date());

// --- Users & auth ---------------------------------------------------------

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "member"] })
    .notNull()
    .default("member"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // random opaque token, stored in the cookie
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: createdAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    userName: text("user_name"), // snapshot, survives user deletion
    action: text("action").notNull(), // e.g. "order.create"
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    summary: text("summary"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId)]
);

// --- Business settings (single row) --------------------------------------

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  businessName: text("business_name").notNull().default("My Business"),
  businessEmail: text("business_email").notNull().default(""),
  businessPhone: text("business_phone").notNull().default(""),
  businessAddress: text("business_address").notNull().default(""),
  invoiceFooter: text("invoice_footer").notNull().default("Thank you for your business!"),
  brandColor: text("brand_color").notNull().default("#c0392b"),
  defaultCurrency: text("default_currency").notNull().default("USD"),
  // Card-processing surcharge rate passed to customers (e.g. 3.4). 0 = off.
  processingFeePercent: real("processing_fee_percent").notNull().default(0),
  updatedAt: updatedAt(),
});

// --- Contacts (customers) -------------------------------------------------

export const contacts = pgTable("contacts", {
  id: id(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  billingAddress: text("billing_address").notNull().default(""),
  billingCity: text("billing_city").notNull().default(""),
  billingState: text("billing_state").notNull().default(""),
  billingZip: text("billing_zip").notNull().default(""),
  billingCountry: text("billing_country").notNull().default("US"),
  shippingAddress: text("shipping_address").notNull().default(""),
  shippingCity: text("shipping_city").notNull().default(""),
  shippingState: text("shipping_state").notNull().default(""),
  shippingZip: text("shipping_zip").notNull().default(""),
  shippingCountry: text("shipping_country").notNull().default("US"),
  notes: text("notes").notNull().default(""),
  // External payment-provider customer IDs (populated lazily on first use).
  stripeCustomerId: text("stripe_customer_id"),
  squareCustomerId: text("square_customer_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// --- Catalog: items & packages -------------------------------------------

export const items = pgTable(
  "items",
  {
    id: id(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default(""),
    // sku/priceCents mirror the FIRST variation, so simple contexts (packages,
    // "starting at" price) work without joining variations.
    sku: text("sku").notNull().default(""),
    priceCents: integer("price_cents").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    active: boolean("active").notNull().default(true),
    imagePath: text("image_path").notNull().default(""),
    // Links this item to a Square catalog object (set when imported from Square).
    squareCatalogId: text("square_catalog_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("items_square_uq").on(t.squareCatalogId)]
);

// Square-style variations: one item can have many sellable versions
// (Small/Medium/Large), each with its own SKU, barcode, and price.
export const itemVariations = pgTable(
  "item_variations",
  {
    id: id(),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Regular"),
    sku: text("sku").notNull().default(""),
    gtin: text("gtin").notNull().default(""), // barcode
    priceCents: integer("price_cents").notNull().default(0),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    imagePath: text("image_path").notNull().default(""),
    squareVariationId: text("square_variation_id"),
  },
  (t) => [index("item_variations_item_idx").on(t.itemId)]
);

export const packages = pgTable("packages", {
  id: id(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const packageItems = pgTable(
  "package_items",
  {
    id: id(),
    packageId: text("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => [index("package_items_pkg_idx").on(t.packageId)]
);

// --- Orders ---------------------------------------------------------------

export const orders = pgTable(
  "orders",
  {
    id: id(),
    number: text("number").notNull().unique(), // internal order number, e.g. "ORD-1007"
    invoiceId: text("invoice_id").notNull().default(""), // customer-facing, incrementing
    contactId: text("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    // Lifecycle matches make-to-order, bill-on-shipment:
    // open (to make) -> shipped -> invoiced -> paid. (+ cancelled)
    status: text("status", {
      enum: ["open", "shipped", "invoiced", "paid", "cancelled"],
    })
      .notNull()
      .default("open"),
    currency: text("currency").notNull().default("USD"),
    // All amounts are integer cents.
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    shippingCents: integer("shipping_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    // Cached sum of succeeded payments; "paid in full" == amountPaid >= total.
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),
    notes: text("notes").notNull().default(""),
    // Invoice presentation + a message printed on the invoice PDF.
    title: text("title").notNull().default(""),
    invoiceMessage: text("invoice_message").notNull().default(""),
    // Card-processing surcharge: whether to add it, and the computed amount.
    applyProcessingFee: boolean("apply_processing_fee").notNull().default(false),
    processingFeeCents: integer("processing_fee_cents").notNull().default(0),
    // The ACTUAL fee Square charged, read back after the payment settles.
    squareProcessingFeeCents: integer("square_processing_fee_cents"),
    // Optional promised/due date — the axis the production dashboard sorts on.
    dueDate: timestamp("due_date", { mode: "date" }),
    // UPS tracking number (entered manually, or discovered via Quantum View).
    trackingNumber: text("tracking_number").notNull().default(""),
    // Latest UPS delivery status, e.g. "Picked up", "In transit", "Delivered".
    trackingStatus: text("tracking_status").notNull().default(""),
    // External references for reconciliation.
    stripeCheckoutId: text("stripe_checkout_id"),
    squarePaymentLinkId: text("square_payment_link_id"),
    squareOrderId: text("square_order_id"),
    // The customer-facing hosted checkout URL, which provider made it, and the
    // amount it charges — so a stale link (amount changed) can be regenerated.
    paymentLinkUrl: text("payment_link_url"),
    paymentLinkProvider: text("payment_link_provider"),
    paymentLinkAmountCents: integer("payment_link_amount_cents"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("orders_contact_idx").on(t.contactId)]
);

export const orderLineItems = pgTable(
  "order_line_items",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // Snapshot of what was ordered (source item/package may change later).
    itemId: text("item_id"),
    packageId: text("package_id"),
    description: text("description").notNull(),
    variationName: text("variation_name").notNull().default(""),
    note: text("note").notNull().default(""),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
    lineTotalCents: integer("line_total_cents").notNull().default(0),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("order_line_items_order_idx").on(t.orderId)]
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note").notNull().default(""),
    userName: text("user_name"),
    createdAt: createdAt(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId)]
);

// --- Payments -------------------------------------------------------------

export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: ["stripe", "square", "manual"],
    }).notNull(),
    providerPaymentId: text("provider_payment_id"),
    providerRaw: text("provider_raw"), // JSON blob of the provider object
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status", {
      enum: ["pending", "succeeded", "failed", "refunded"],
    }).notNull(),
    method: text("method").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    // Prevents the same provider payment from being recorded twice
    // (idempotency for polling + webhooks running together).
    unique("payments_provider_ref_uq").on(t.provider, t.providerPaymentId),
  ]
);

// --- Documents (DocuSeal e-signatures) -----------------------------------

export const documents = pgTable(
  "documents",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("docuseal"),
    templateId: text("template_id"),
    submissionId: text("submission_id"),
    status: text("status", {
      enum: ["pending", "completed", "declined", "expired"],
    })
      .notNull()
      .default("pending"),
    signerEmail: text("signer_email").notNull().default(""),
    signedPdfPath: text("signed_pdf_path"),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (t) => [index("documents_order_idx").on(t.orderId)]
);

// --- Webhook events (idempotency + audit for inbound provider calls) ------

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: id(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull().default(""),
    payload: text("payload").notNull().default(""),
    processed: boolean("processed").notNull().default(false),
    receivedAt: createdAt(),
  },
  (t) => [unique("webhook_events_uq").on(t.provider, t.eventId)]
);

// --- Personal notes (single-user scratchpad) ------------------------------

export const notes = pgTable(
  "notes",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("notes_user_idx").on(t.userId)]
);

// A tiny counter table so order numbers are sequential & human-friendly.
export const counters = pgTable("counters", {
  name: text("name").primaryKey(),
  value: integer("value").notNull().default(0),
});

export type User = typeof users.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Item = typeof items.$inferSelect;
export type ItemVariation = typeof itemVariations.$inferSelect;
export type Package = typeof packages.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderLineItem = typeof orderLineItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Settings = typeof settings.$inferSelect;
