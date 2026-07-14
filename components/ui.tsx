export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${status}`}>{status}</span>;
}

/** A submit button that also carries a hidden field (e.g. an id) for actions. */
export function InlineAction({
  action,
  id,
  label,
  className = "btn ghost btn-sm",
}: {
  action: (formData: FormData) => void | Promise<void>;
  id?: string;
  label: string;
  className?: string;
}) {
  return (
    <form action={action} style={{ display: "inline" }}>
      {id && <input type="hidden" name="id" value={id} />}
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
