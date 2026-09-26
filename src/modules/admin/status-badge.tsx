const LABELS: Record<string, string> = {
  pending: "Pendente",
  active: "Ativa",
  suspended: "Suspensa",
};

// Monocromático: pendente = contorno, ativa = preenchido, suspensa = tachado
export function StatusBadge({ status }: { status: string }) {
  const label = LABELS[status] ?? status;
  const cls =
    status === "active"
      ? "bg-primary text-primary-fg"
      : status === "suspended"
        ? "border border-foreground text-muted line-through"
        : "border border-border text-muted";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
