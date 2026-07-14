import { desc, eq, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, type Contact } from "@/lib/db/schema";

export type ContactInput = Omit<
  Contact,
  "id" | "createdAt" | "updatedAt" | "stripeCustomerId" | "squareCustomerId"
>;

export function listContacts(search?: string): Contact[] {
  const q = db.select().from(contacts);
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    return q
      .where(
        or(
          like(contacts.companyName, term),
          like(contacts.contactName, term),
          like(contacts.email, term)
        )
      )
      .orderBy(desc(contacts.updatedAt))
      .all();
  }
  return q.orderBy(desc(contacts.updatedAt)).all();
}

export function getContact(id: string): Contact | undefined {
  return db.select().from(contacts).where(eq(contacts.id, id)).get();
}

export function createContact(input: ContactInput): Contact {
  return db.insert(contacts).values(input).returning().get();
}

export function updateContact(
  id: string,
  input: Partial<ContactInput>
): Contact | undefined {
  db.update(contacts)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(contacts.id, id))
    .run();
  return getContact(id);
}

export function deleteContact(id: string): void {
  db.delete(contacts).where(eq(contacts.id, id)).run();
}
