import { listHistory } from "./queries";
import { HistoryList } from "./history-list";

// Painel recolhível "Histórico de alterações" de um registro (e dos filhos dele).
export async function HistoryPanel({ entityIds }: { entityIds: string[] }) {
  const { rows, hasMore } = await listHistory({ entityIds, limit: 30 });
  return (
    <details className="rounded-lg border bg-surface">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted hover:text-foreground">
        Histórico de alterações ({rows.length}{hasMore ? "+" : ""})
      </summary>
      <div className="border-t">
        <HistoryList rows={rows} />
      </div>
    </details>
  );
}
