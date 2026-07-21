import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notes, type Note } from "@/lib/db/schema";

export async function listNotes(userId: string): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt));
}

export async function getNote(userId: string, id: string): Promise<Note | undefined> {
  return (
    await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1)
  )[0];
}

export async function createNote(
  userId: string,
  input: { title: string; body: string }
): Promise<Note> {
  return (
    await db
      .insert(notes)
      .values({ userId, title: input.title, body: input.body })
      .returning()
  )[0];
}

export async function updateNote(
  userId: string,
  id: string,
  input: Partial<{ title: string; body: string; pinned: boolean }>
): Promise<void> {
  await db
    .update(notes)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)));
}

export async function deleteNote(userId: string, id: string): Promise<void> {
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}
