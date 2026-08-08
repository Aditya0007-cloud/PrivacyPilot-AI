import { CheckCircle2, XCircle } from "lucide-react";

const toastStyles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
};

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
};

export function Toast({ toast, onDismiss }) {
  if (!toast) {
    return null;
  }

  const Icon = toastIcons[toast.type] || CheckCircle2;

  return (
    <div
      className={`fixed right-5 top-5 z-50 flex max-w-sm items-start gap-3 rounded-lg border p-4 text-sm font-medium shadow-panel ${toastStyles[toast.type]}`}
      role="status"
    >
      <Icon className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
      <p className="flex-1 leading-6">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md px-2 py-1 text-xs font-semibold hover:bg-white/60"
      >
        Close
      </button>
    </div>
  );
}
