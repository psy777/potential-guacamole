import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";

export function userCount(): number {
  const row = db.select({ n: sql<number>`count(*)` }).from(users).get();
  return row?.n ?? 0;
}

export function listUsers(): User[] {
  return db.select().from(users).orderBy(asc(users.createdAt)).all();
}

export function getUserByEmail(email: string): User | undefined {
  return db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "member";
}): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  return db
    .insert(users)
    .values({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
    })
    .returning()
    .get();
}

export async function setUserPassword(
  id: string,
  password: string
): Promise<void> {
  const passwordHash = await hashPassword(password);
  db.update(users).set({ passwordHash }).where(eq(users.id, id)).run();
}

export function setUserActive(id: string, active: boolean): void {
  db.update(users).set({ active }).where(eq(users.id, id)).run();
}
