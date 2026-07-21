import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";

export async function userCount(): Promise<number> {
  const row = (await db.select({ n: sql<number>`count(*)::int` }).from(users))[0];
  return row?.n ?? 0;
}

export async function listUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(asc(users.createdAt));
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return (
    await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
  )[0];
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "member";
}): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  return (
    await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
      })
      .returning()
  )[0];
}

export async function setUserPassword(id: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
}

export async function setUserActive(id: string, active: boolean): Promise<void> {
  await db.update(users).set({ active }).where(eq(users.id, id));
}
