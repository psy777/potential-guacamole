import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, type Order, type Contact } from "@/lib/db/schema";
import { docuseal as docusealConfig, UPLOAD_DIR } from "@/lib/config";

async function docusealFetch(pathname: string, init?: RequestInit) {
  const res = await fetch(`${docusealConfig.apiUrl}${pathname}`, {
    ...init,
    headers: {
      "X-Auth-Token": docusealConfig.apiKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`DocuSeal ${pathname} failed: ${JSON.stringify(json)}`);
  }
  return json;
}

/**
 * Create a DocuSeal signature request for an order and record it locally.
 * DocuSeal emails the signer; we learn the outcome by webhook or by polling.
 */
export async function requestSignature(
  order: Order,
  contact: Contact | null,
  signerEmail: string
): Promise<{ ok: boolean; error?: string }> {
  if (!docusealConfig.isConfigured) {
    return {
      ok: false,
      error:
        "DocuSeal is not configured. Set DOCUSEAL_API_KEY and DOCUSEAL_TEMPLATE_ID in your .env.",
    };
  }
  try {
    const submitters = await docusealFetch("/submissions", {
      method: "POST",
      body: JSON.stringify({
        template_id: Number(docusealConfig.templateId),
        send_email: true,
        submitters: [
          {
            role: "Signer",
            email: signerEmail,
            name: contact?.contactName || contact?.companyName || undefined,
            fields: [],
            metadata: { orderId: order.id, orderNumber: order.number },
          },
        ],
      }),
    });

    // The submissions endpoint returns an array of submitters sharing one submission_id.
    const submissionId = String(submitters?.[0]?.submission_id ?? "");

    db.insert(documents)
      .values({
        orderId: order.id,
        provider: "docuseal",
        templateId: docusealConfig.templateId,
        submissionId,
        status: "pending",
        signerEmail,
      })
      .run();

    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Poll a pending submission and, if complete, download the signed PDF. */
export async function syncDocument(doc: {
  id: string;
  orderId: string;
  submissionId: string | null;
}): Promise<void> {
  if (!doc.submissionId || !docusealConfig.isConfigured) return;

  const submission = await docusealFetch(`/submissions/${doc.submissionId}`);
  const status: string = submission?.status ?? "pending";

  if (status === "completed") {
    let signedPdfPath: string | null = null;
    const documentUrl: string | undefined =
      submission?.documents?.[0]?.url ??
      submission?.submitters?.[0]?.documents?.[0]?.url;
    if (documentUrl) {
      try {
        const pdfRes = await fetch(documentUrl);
        const buf = Buffer.from(await pdfRes.arrayBuffer());
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        const filename = `signed-${doc.orderId}-${doc.id}.pdf`;
        fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);
        signedPdfPath = filename;
      } catch (err) {
        console.error("[docuseal] failed to download signed PDF:", err);
      }
    }
    db.update(documents)
      .set({ status: "completed", completedAt: new Date(), signedPdfPath })
      .where(eq(documents.id, doc.id))
      .run();
  } else if (status === "declined" || status === "expired") {
    db.update(documents)
      .set({ status: status as "declined" | "expired" })
      .where(eq(documents.id, doc.id))
      .run();
  }
}

/** Poll all pending DocuSeal submissions. */
export async function reconcileOpenDocuments(): Promise<void> {
  if (!docusealConfig.isConfigured) return;
  const pending = db
    .select()
    .from(documents)
    .where(and(eq(documents.status, "pending"), ne(documents.provider, "")))
    .all();
  for (const doc of pending) {
    try {
      await syncDocument(doc);
    } catch (err) {
      console.error("[docuseal] sync failed:", (err as Error).message);
    }
  }
}

/** Verify a DocuSeal webhook using the shared secret (if configured). */
export function verifyDocusealWebhook(signature: string | null): boolean {
  if (!docusealConfig.webhookSecret) return true; // no secret set → accept
  if (!signature) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(docusealConfig.webhookSecret)
    );
  } catch {
    return false;
  }
}
