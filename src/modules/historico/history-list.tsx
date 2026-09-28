import { ACTION_LABELS, TABLE_LABELS, changeLines, type AuditRow } from "./format";

function when(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

export function HistoryList({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-muted">Nenhuma alteração registrada.</p>;
  }
  return (
    <ul className="divide-y">
      {rows.map((r) => {
        const lines = changeLines(r);
        return (
          <li key={r.id} className="space-y-1 px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0">
                <span className="font-medium">{ACTION_LABELS[r.action] ?? r.action}</span>
                <span className="text-muted">
                  {" · "}{TABLE_LABELS[r.table_name] ?? r.table_name}
                  {r.record_label ? ` · ${r.record_label}` : ""}
                </span>
              </p>
              <span className="tabular shrink-0 text-xs text-muted">{when(r.changed_at)}</span>
            </div>
            <p className="text-xs text-muted">por {r.changed_by_email ?? "sistema / link público"}</p>
            {lines.length > 0 && (
              <ul className="space-y-0.5 text-xs">
                {lines.map((l, i) => (
                  <li key={i}>
                    <span className="text-muted">{l.label}: </span>
                    {l.from !== undefined ? (
                      <>
                        <span className="text-muted line-through">{l.from}</span>
                        <span className="text-muted"> → </span>
                        <span>{l.to}</span>
                      </>
                    ) : (
                      <span>{l.to}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
