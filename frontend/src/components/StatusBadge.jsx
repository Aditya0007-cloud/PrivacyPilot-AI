import { deletionStatusLabels, deletionStatusStyles } from "../lib/status.js";

export function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-md border px-2.5 py-1 text-xs font-semibold uppercase ${
        deletionStatusStyles[status] || "border-ink/10 bg-ink/5 text-ink/55"
      }`}
    >
      {deletionStatusLabels[status] || status}
    </span>
  );
}
