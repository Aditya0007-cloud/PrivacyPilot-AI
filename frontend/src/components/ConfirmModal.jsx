export function ConfirmModal({
  title,
  message,
  confirmLabel,
  loadingLabel = "Working...",
  isOpen,
  isLoading,
  onCancel,
  onConfirm,
  children,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/35 px-4">
      <section className="w-full max-w-md rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-ink/65">{message}</p>
        {children}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-md border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/70 transition hover:border-ink/30 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-md bg-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink disabled:opacity-60"
          >
            {isLoading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
