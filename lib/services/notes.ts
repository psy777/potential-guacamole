import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notes, type Note } from "@/lib/db/schema";

export function listNotes(userId: string): Note[] {
  return db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt))
    .all();
}

export function getNote(userId: string, id: string): Note | undefined {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .get();
}

export function createNote(
  userId: string,
  input: { title: string; body: string }
): Note {
  return db
    .insert(notes)
    .values({ userId, title: input.title, body: input.body })
    .returning()
    .get();
}

export function updateNote(
  userId: string,
  id: string,
  input: Partial<{ title: string; body: string; pinned: boolean }>
): void {
  db.update(notes)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .run();
}

export function deleteNote(userId: string, id: string): void {
  db.delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .run();
}
