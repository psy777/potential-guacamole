import { bulkCreateItemsAction } from "../actions";

export default function BulkItemsPage() {
  return (
    <>
      <h1>Bulk add items</h1>
      <form action={bulkCreateItemsAction} className="card">
        <p className="small muted">
          One item per line: <code>Name, Price, Category</code> — price and category are optional.
          Each becomes an item with a single &ldquo;Regular&rdquo; variation; open any item afterward to add
          more variations, images, and barcodes.
        </p>
        <div className="field">
          <textarea
            name="bulk"
            rows={14}
            placeholder={"Jesus Loves You, 22.00, Standard\nYou Are Held, 22.00, Standard\nBlessed Assurance, 28.00, Standard"}
            style={{ fontFamily: "var(--mono, ui-monospace, monospace)" }}
          />
        </div>
        <div className="actions">
          <button type="submit" className="btn">Create items</button>
          <a href="/items" className="btn secondary">Cancel</a>
        </div>
      </form>
    </>
  );
}
