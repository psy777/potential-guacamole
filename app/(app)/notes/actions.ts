"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import {
  createNote,
  updateNote,
  deleteNote,
} from "@/lib/services/notes";

export async function createNoteAction(fd: FormData) {
  const user = await requireUser();
  const title = String(fd.get("title") || "").trim();
  const body = String(fd.get("body") || "").trim();
  if (title || body) createNote(user.id, { title, body });
  revalidatePath("/notes");
}

export async function updateNoteAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  updateNote(user.id, id, {
    title: String(fd.get("title") || "").trim(),
    body: String(fd.get("body") || "").trim(),
  });
  revalidatePath("/notes");
}

export async function togglePinAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  updateNote(user.id, id, { pinned: fd.get("pinned") === "true" });
  revalidatePath("/notes");
}

export async function deleteNoteAction(fd: FormData) {
  const user = await requireUser();
  deleteNote(user.id, String(fd.get("id")));
  revalidatePath("/notes");
}
