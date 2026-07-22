"use client";

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${status}`}>{status}</span>;
}

/**
 * A submit button that carries a hidden field (e.g. an id) for a server action.
 * Pass `confirmMessage` to require a confirmation click before the action runs
 * (used for destructive actions like delete).
 */
export function InlineAction({
  action,
  id,
  label,
  className = "btn ghost btn-sm",
  confirmMessage,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id?: string;
  label: string;
  className?: string;
  confirmMessage?: string;
}) {
  return (
    <form
      action={action}
      style={{ display: "inline" }}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {id && <input type="hidden" name="id" value={id} />}
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
