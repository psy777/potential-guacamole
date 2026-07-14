"use client";

import { useRef, useState } from "react";

/**
 * A compose-before-send modal for invoice emails. Formatting tools (bold,
 * italic, underline, link, list) on the left; merge-field inserts (client name,
 * business name, order number) on the right. On send it posts the composed HTML
 * to the server action, which attaches the invoice PDF and a "Pay online" button.
 */
export function EmailComposer({
  action,
  orderId,
  disabled,
  emailConfigured,
  toEmail,
  defaultSubject,
  defaultBody,
  clientName,
  businessName,
  orderNumber,
}: {
  action: (formData: FormData) => Promise<void>;
  orderId: string;
  disabled: boolean;
  emailConfigured: boolean;
  toEmail: string;
  defaultSubject: string;
  defaultBody: string;
  clientName: string;
  businessName: string;
  orderNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLInputElement>(null);

  const syncBody = () => {
    if (editorRef.current && bodyRef.current) {
      bodyRef.current.value = editorRef.current.innerHTML;
    }
  };
  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncBody();
  };
  const insert = (text: string) => exec("insertText", text);
  const addLink = () => {
    const url = window.prompt("Link URL:", "https://");
    if (url) exec("createLink", url);
  };

  // Keep toolbar clicks from stealing focus/selection from the editor.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div>
      <button
        type="button"
        className="btn secondary btn-sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        Email invoice
      </button>
      {!emailConfigured && (
        <span className="small muted"> — set RESEND_API_KEY to enable</span>
      )}

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Compose email</h2>
            <p className="small muted" style={{ marginTop: "-0.25rem" }}>
              To: {toEmail || "—"}
            </p>

            <form action={action} onSubmit={syncBody}>
              <input type="hidden" name="id" value={orderId} />
              <input type="hidden" name="body" ref={bodyRef} defaultValue={defaultBody} />

              <div className="field">
                <label htmlFor="subject">Subject</label>
                <input id="subject" name="subject" defaultValue={defaultSubject} />
              </div>

              <label>Message</label>
              <div className="editor-toolbar">
                <div className="group">
                  <button type="button" className="toolbar-btn" style={{ fontWeight: "bold" }} onMouseDown={keepFocus} onClick={() => exec("bold")}>B</button>
                  <button type="button" className="toolbar-btn" style={{ fontStyle: "italic" }} onMouseDown={keepFocus} onClick={() => exec("italic")}>I</button>
                  <button type="button" className="toolbar-btn" style={{ textDecoration: "underline" }} onMouseDown={keepFocus} onClick={() => exec("underline")}>U</button>
                  <button type="button" className="toolbar-btn" onMouseDown={keepFocus} onClick={addLink}>🔗 Link</button>
                  <button type="button" className="toolbar-btn" onMouseDown={keepFocus} onClick={() => exec("insertUnorderedList")}>• List</button>
                </div>
                <div className="group">
                  <button type="button" className="toolbar-btn" onMouseDown={keepFocus} onClick={() => insert(clientName)}>+ Client name</button>
                  <button type="button" className="toolbar-btn" onMouseDown={keepFocus} onClick={() => insert(businessName)}>+ Business name</button>
                  <button type="button" className="toolbar-btn" onMouseDown={keepFocus} onClick={() => insert(orderNumber)}>+ Order #</button>
                </div>
              </div>
              <div
                ref={editorRef}
                className="editor"
                contentEditable
                suppressContentEditableWarning
                onInput={syncBody}
                dangerouslySetInnerHTML={{ __html: defaultBody }}
              />

              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                The invoice PDF and a &ldquo;Pay online&rdquo; button are attached automatically.
              </p>

              <div className="actions" style={{ marginTop: "1rem" }}>
                <button type="submit" className="btn">Send email</button>
                <button type="button" className="btn secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
