import { REL_LABELS, type RelStatus } from "./relationship";

export function RelBadge({ status }: { status: RelStatus }) {
  const cls =
    status === "active"
      ? "border border-border text-muted"
      : status === "stale"
        ? "text-warning"
        : "bg-primary text-primary-fg";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls} ${
        status === "stale" ? "border border-warning/40 bg-warning/10" : ""
      }`}
    >
      {REL_LABELS[status]}
    </span>
  );
}
