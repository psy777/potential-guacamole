import { requireUser } from "@/lib/auth/session";
import { listNotes } from "@/lib/services/notes";
import {
  createNoteAction,
  updateNoteAction,
  togglePinAction,
  deleteNoteAction,
} from "./actions";

export default async function NotesPage() {
  const user = await requireUser();
  const notes = await listNotes(user.id);

  return (
    <>
      <h1>Notes</h1>
      <p className="muted small">Your personal scratchpad — only you can see these.</p>

      <form action={createNoteAction} className="card">
        <div className="field">
          <input name="title" placeholder="Title" />
        </div>
        <div className="field">
          <textarea name="body" rows={3} placeholder="Write a note…" />
        </div>
        <button type="submit" className="btn">Add note</button>
      </form>

      {notes.length === 0 ? (
        <p className="muted">No notes yet.</p>
      ) : (
        notes.map((n) => (
          <div key={n.id} className="card">
            <form action={updateNoteAction}>
              <input type="hidden" name="id" value={n.id} />
              <div className="field">
                <input name="title" defaultValue={n.title} placeholder="Title" />
              </div>
              <div className="field">
                <textarea name="body" rows={3} defaultValue={n.body} />
              </div>
              <div className="actions">
                <button type="submit" className="btn secondary btn-sm">Save</button>
              </div>
            </form>
            <div className="actions" style={{ marginTop: "0.5rem" }}>
              <form action={togglePinAction} style={{ display: "inline" }}>
                <input type="hidden" name="id" value={n.id} />
                <input type="hidden" name="pinned" value={(!n.pinned).toString()} />
                <button type="submit" className="btn ghost btn-sm">
                  {n.pinned ? "📌 Unpin" : "Pin"}
                </button>
              </form>
              <form action={deleteNoteAction} style={{ display: "inline" }}>
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" className="btn danger btn-sm">Delete</button>
              </form>
              <span className="small muted">
                Updated {new Date(n.updatedAt).toLocaleString("en-US")}
              </span>
            </div>
          </div>
        ))
      )}
    </>
  );
}
