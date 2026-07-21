import { desc, eq, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, type Contact } from "@/lib/db/schema";

// The editable contact fields on the normal contact form. Portal-access fields
// (portalEnabled, passwordHash, wholesaleDiscountPercent) are managed separately
// via the portal-access controls, not this form.
export type ContactInput = Omit<
  Contact,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "stripeCustomerId"
  | "squareCustomerId"
  | "portalEnabled"
  | "passwordHash"
  | "wholesaleDiscountPercent"
  | "portalInviteToken"
  | "portalInviteExpiresAt"
>;

export async function listContacts(search?: string): Promise<Contact[]> {
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    return db
      .select()
      .from(contacts)
      .where(
        or(
          like(contacts.companyName, term),
          like(contacts.contactName, term),
          like(contacts.email, term)
        )
      )
      .orderBy(desc(contacts.updatedAt));
  }
  return db.select().from(contacts).orderBy(desc(contacts.updatedAt));
}

export async function getContact(id: string): Promise<Contact | undefined> {
  return (await db.select().from(contacts).where(eq(contacts.id, id)).limit(1))[0];
}

export async function createContact(input: ContactInput): Promise<Contact> {
  return (await db.insert(contacts).values(input).returning())[0];
}

export async function updateContact(
  id: string,
  input: Partial<ContactInput>
): Promise<Contact | undefined> {
  await db
    .update(contacts)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(contacts.id, id));
  return getContact(id);
}

export async function deleteContact(id: string): Promise<void> {
  await db.delete(contacts).where(eq(contacts.id, id));
}
