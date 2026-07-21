import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactSessions, contacts, type Contact } from "@/lib/db/schema";
import { WHOLESALE_COOKIE, PORTAL_LOGIN } from "@/lib/constants";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

/** Create a portal session for a contact and set the wholesale cookie. */
export async function createContactSession(contactId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(contactSessions).values({ id: token, contactId, expiresAt });

  const jar = await cookies();
  jar.set(WHOLESALE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** The contact behind the current wholesale cookie, or null. */
export async function getCurrentContact(): Promise<Contact | null> {
  const jar = await cookies();
  const token = jar.get(WHOLESALE_COOKIE)?.value;
  if (!token) return null;

  const row = (
    await db
      .select({ contact: contacts })
      .from(contactSessions)
      .innerJoin(contacts, eq(contactSessions.contactId, contacts.id))
      .where(
        and(eq(contactSessions.id, token), gt(contactSessions.expiresAt, new Date()))
      )
      .limit(1)
  )[0];

  // Access can be revoked at any time by clearing portalEnabled.
  if (!row || !row.contact.portalEnabled) return null;
  return row.contact;
}

/** Use in any protected portal page/layout. Redirects to the portal login. */
export async function requireContact(): Promise<Contact> {
  const contact = await getCurrentContact();
  if (!contact) redirect(PORTAL_LOGIN);
  return contact;
}

export async function destroyContactSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(WHOLESALE_COOKIE)?.value;
  if (token) {
    await db.delete(contactSessions).where(eq(contactSessions.id, token));
    jar.delete(WHOLESALE_COOKIE);
  }
}

/** Authenticate an email + password against portal-enabled contacts. */
export async function authenticateContact(
  email: string,
  password: string
): Promise<Contact | null> {
  const contact = (
    await db
      .select()
      .from(contacts)
      .where(eq(contacts.email, email.trim().toLowerCase()))
      .limit(1)
  )[0];
  if (!contact || !contact.portalEnabled || !contact.passwordHash) return null;
  const ok = await verifyPassword(password, contact.passwordHash);
  return ok ? contact : null;
}

// --- Studio-side administration (grant / revoke / reset portal access) ------

/** Set a portal password for a contact and enable their access. */
export async function setContactPassword(
  contactId: string,
  password: string
): Promise<void> {
  const passwordHash = await hashPassword(password);
  await db
    .update(contacts)
    .set({ passwordHash, portalEnabled: true, updatedAt: new Date() })
    .where(eq(contacts.id, contactId));
}

/** Set a contact's wholesale discount override (null clears it → global default). */
export async function setContactDiscount(
  contactId: string,
  percent: number | null
): Promise<void> {
  const value =
    percent == null || Number.isNaN(percent)
      ? null
      : Math.min(100, Math.max(0, percent));
  await db
    .update(contacts)
    .set({ wholesaleDiscountPercent: value, updatedAt: new Date() })
    .where(eq(contacts.id, contactId));
}

/** Enable or disable a contact's portal access without touching their password. */
export async function setContactPortalEnabled(
  contactId: string,
  enabled: boolean
): Promise<void> {
  await db
    .update(contacts)
    .set({ portalEnabled: enabled, updatedAt: new Date() })
    .where(eq(contacts.id, contactId));
  if (!enabled) {
    // Revoking access should also kill any live sessions.
    await db.delete(contactSessions).where(eq(contactSessions.contactId, contactId));
  }
}
