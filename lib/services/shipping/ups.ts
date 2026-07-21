import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, type Order } from "@/lib/db/schema";
import { setOrderStatus } from "@/lib/services/orders";
import { ups as upsConfig } from "@/lib/config";

// --- OAuth (client credentials, token cached in-memory) -------------------

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const creds = Buffer.from(
    `${upsConfig.clientId}:${upsConfig.clientSecret}`
  ).toString("base64");
  const res = await fetch(`${upsConfig.apiBase}/security/v1/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`UPS OAuth failed: ${JSON.stringify(json)}`);
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000,
  };
  return cachedToken.token;
}

// --- Track a single number ------------------------------------------------

export type TrackResult = {
  description: string;
  delivered: boolean;
  inTransit: boolean;
};

/** Parse a UPS Tracking API response into a simple status. Pure + defensive. */
export function parseTrack(json: unknown): TrackResult | null {
  const j = json as {
    trackResponse?: {
      shipment?: Array<{
        package?: Array<{
          currentStatus?: { type?: string; description?: string };
          activity?: Array<{ status?: { type?: string; description?: string } }>;
        }>;
      }>;
    };
  };
  const pkg = j?.trackResponse?.shipment?.[0]?.package?.[0];
  if (!pkg) return null;
  const status = pkg.currentStatus ?? pkg.activity?.[0]?.status ?? {};
  const type = (status.type || "").toUpperCase();
  const description = status.description || "";
  const delivered = type === "D" || /delivered/i.test(description);
  const inTransit =
    !delivered &&
    (type === "I" ||
      /transit|out for delivery|picked up|origin scan|departed|arrival scan|on its way/i.test(
        description
      ));
  return { description: description || (delivered ? "Delivered" : "In transit"), delivered, inTransit };
}

export async function trackByNumber(
  trackingNumber: string
): Promise<TrackResult | null> {
  if (!upsConfig.isConfigured) return null;
  const token = await getToken();
  const res = await fetch(
    `${upsConfig.apiBase}/api/track/v1/details/${encodeURIComponent(trackingNumber)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        transId: `fc-${Date.now()}`,
        transactionSrc: "firecoast",
      },
    }
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`UPS track failed: ${JSON.stringify(json?.response?.errors ?? json)}`);
  }
  return parseTrack(json);
}

// --- Quantum View discovery ----------------------------------------------

export type QVShipment = {
  trackingNumber: string;
  referenceNumbers: string[];
  event: "manifest" | "origin" | "exception" | "delivery" | "unknown";
};

const EVENT_KEYS: Record<string, QVShipment["event"]> = {
  Manifest: "manifest",
  Origin: "origin",
  Exception: "exception",
  Delivery: "delivery",
};

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Walk a Quantum View subtree collecting tracking numbers and reference
 * numbers, tolerant of UPS's array-or-object shape variance. Pure.
 */
function collect(node: unknown, tracking: Set<string>, refs: Set<string>): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, tracking, refs));
    return;
  }
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "TrackingNumber" && typeof value === "string") tracking.add(value);
    else if (/ReferenceNumber$/.test(key)) {
      toArray(value as unknown).forEach((r) => {
        const val = (r as { Value?: unknown })?.Value;
        if (val != null) refs.add(String(val));
      });
    } else if (typeof value === "object") {
      collect(value, tracking, refs);
    }
  }
}

/** Parse a Quantum View response into a flat list of shipment events. Pure. */
export function parseQuantumView(json: unknown): QVShipment[] {
  const events =
    (json as { QuantumViewResponse?: { QuantumViewEvents?: { SubscriptionEvents?: unknown } } })
      ?.QuantumViewResponse?.QuantumViewEvents?.SubscriptionEvents;
  const out: QVShipment[] = [];
  for (const sub of toArray(events)) {
    for (const file of toArray((sub as { SubscriptionFile?: unknown }).SubscriptionFile)) {
      for (const [key, event] of Object.entries(EVENT_KEYS)) {
        const subtree = (file as Record<string, unknown>)[key];
        if (!subtree) continue;
        const tracking = new Set<string>();
        const refs = new Set<string>();
        collect(subtree, tracking, refs);
        if (tracking.size || refs.size) {
          out.push({
            trackingNumber: [...tracking][0] ?? "",
            referenceNumbers: [...refs],
            event,
          });
        }
      }
    }
  }
  return out;
}

function fmtDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function quantumViewEvents(): Promise<QVShipment[]> {
  if (!upsConfig.isConfigured) return [];
  const token = await getToken();
  const now = new Date();
  const begin = new Date(now.getTime() - 7 * 86_400_000);
  const res = await fetch(`${upsConfig.apiBase}/api/quantumview/v3/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      transId: `fc-qv-${Date.now()}`,
      transactionSrc: "firecoast",
    },
    body: JSON.stringify({
      QuantumViewRequest: {
        Request: {
          RequestAction: "QVEvents",
          TransactionReference: { CustomerContext: "firecoast" },
        },
        SubscriptionRequest: {
          DateTimeRange: { BeginDateTime: fmtDateTime(begin), EndDateTime: fmtDateTime(now) },
        },
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`UPS Quantum View failed: ${JSON.stringify(json?.response?.errors ?? json)}`);
  }
  return parseQuantumView(json);
}

// --- Reconcile: discover shipments + keep statuses current ----------------

function statusLabel(event: QVShipment["event"]): string {
  switch (event) {
    case "manifest": return "Label created";
    case "origin": return "Picked up by UPS";
    case "exception": return "Delivery exception";
    case "delivery": return "Delivered";
    default: return "In transit";
  }
}

/** Build a lookup from every way a reference might name an order → the order. */
function orderLookup(rows: Order[]): Map<string, Order> {
  const map = new Map<string, Order>();
  for (const o of rows) {
    const keys = [o.number, o.invoiceId, o.number.replace(/^ORD-/, "")].filter(Boolean);
    for (const k of keys) map.set(k.toUpperCase(), o);
  }
  return map;
}

export async function reconcileShipments(): Promise<void> {
  if (!upsConfig.isConfigured) return;

  const active = await db
    .select()
    .from(orders)
    .where(ne(orders.status, "cancelled"));

  // 1) Quantum View discovery — match by reference, capture tracking, mark shipped.
  try {
    const shipments = await quantumViewEvents();
    const lookup = orderLookup(active);
    for (const s of shipments) {
      let order: Order | undefined;
      for (const ref of s.referenceNumbers) {
        order = lookup.get(ref.toUpperCase()) ?? lookup.get(`ORD-${ref}`.toUpperCase());
        if (order) break;
      }
      if (!order) continue;
      await db
        .update(orders)
        .set({
          trackingNumber: order.trackingNumber || s.trackingNumber,
          trackingStatus: statusLabel(s.event),
        })
        .where(eq(orders.id, order.id));
      if ((s.event === "origin" || s.event === "delivery") && order.status === "open") {
        await setOrderStatus(order.id, "shipped", { name: "UPS" }, `Auto-shipped via UPS (${s.event})`);
      }
    }
  } catch (err) {
    console.error("[ups] Quantum View sync:", (err as Error).message);
  }

  // 2) Track-by-number status refresh for orders that have a number and aren't delivered.
  for (const o of active) {
    if (!o.trackingNumber || /delivered/i.test(o.trackingStatus)) continue;
    try {
      const r = await trackByNumber(o.trackingNumber);
      if (!r) continue;
      await db
        .update(orders)
        .set({ trackingStatus: r.delivered ? `Delivered · ${r.description}` : r.description })
        .where(eq(orders.id, o.id));
      if (o.status === "open" && (r.inTransit || r.delivered)) {
        await setOrderStatus(o.id, "shipped", { name: "UPS" }, `Auto-shipped via UPS (${r.description})`);
      }
    } catch (err) {
      console.error(`[ups] track ${o.number}:`, (err as Error).message);
    }
  }
}

/** Refresh one order's tracking status now (manual "Sync" button). */
export async function syncOrderTracking(orderId: string): Promise<void> {
  const o = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!o?.trackingNumber || !upsConfig.isConfigured) return;
  const r = await trackByNumber(o.trackingNumber);
  if (!r) return;
  await db
    .update(orders)
    .set({ trackingStatus: r.delivered ? `Delivered · ${r.description}` : r.description })
    .where(eq(orders.id, orderId));
  if (o.status === "open" && (r.inTransit || r.delivered)) {
    await setOrderStatus(orderId, "shipped", { name: "UPS" }, `Auto-shipped via UPS (${r.description})`);
  }
}
