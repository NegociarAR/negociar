import { STATUS_LABELS, type QuoteStatus } from "./types";

// Preenchido = fechado (aprovado); contorno = em andamento; tachado = recusado
export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const cls =
    status === "approved"
      ? "bg-primary text-primary-fg"
      : status === "rejected"
        ? "border border-foreground text-muted line-through"
        : status === "superseded"
          ? "border border-border text-muted line-through"
          : status === "canceled"
            ? "border border-border text-muted line-through"
            : "border border-border text-muted";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
