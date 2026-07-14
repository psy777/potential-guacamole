// Central place that reads environment configuration.
// Secrets (API keys) live ONLY in the environment (.env) — never in the database.
import path from "node:path";

// Where the SQLite database and uploaded files live. Defaults to ./data next
// to the app. Override with FIRECOAST_DATA_DIR to point at another location.
export const DATA_DIR =
  process.env.FIRECOAST_DATA_DIR || path.join(process.cwd(), "data");

export const DB_PATH = path.join(DATA_DIR, "firecoast.db");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

// --- Email (Resend) ---
export const email = {
  apiKey: process.env.RESEND_API_KEY || "",
  from: process.env.EMAIL_FROM || "",
  get isConfigured() {
    return Boolean(this.apiKey && this.from);
  },
};

// --- Stripe ---
export const stripe = {
  secretKey: process.env.STRIPE_SECRET_KEY || "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  get isConfigured() {
    return Boolean(this.secretKey);
  },
};

// --- Square ---
export const square = {
  accessToken: process.env.SQUARE_ACCESS_TOKEN || "",
  locationId: process.env.SQUARE_LOCATION_ID || "",
  // "sandbox" or "production"
  environment: (process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase(),
  webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "",
  get apiBase() {
    return this.environment === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";
  },
  get isConfigured() {
    return Boolean(this.accessToken && this.locationId);
  },
};

// --- DocuSeal ---
export const docuseal = {
  // Self-hosted DocuSeal usually runs at http://localhost:3001; the hosted
  // service is https://api.docuseal.com.
  apiUrl: process.env.DOCUSEAL_API_URL || "https://api.docuseal.com",
  apiKey: process.env.DOCUSEAL_API_KEY || "",
  templateId: process.env.DOCUSEAL_TEMPLATE_ID || "",
  webhookSecret: process.env.DOCUSEAL_WEBHOOK_SECRET || "",
  get isConfigured() {
    return Boolean(this.apiKey && this.templateId);
  },
};

// Public base URL of THIS app, used to build webhook/return URLs.
export const APP_URL = process.env.APP_URL || "http://localhost:3000";

// How often (ms) the background poller reconciles payment/signature status.
export const POLL_INTERVAL_MS = Number(
  process.env.POLL_INTERVAL_MS || 60_000
);
