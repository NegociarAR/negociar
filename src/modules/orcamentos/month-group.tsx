"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteHourEntry } from "./hourly-actions";
import { useToast } from "@/components/toast";
import type { MonthGroup } from "./hourly-types";

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[Number(m) - 1]}/${y}`;
}

const SUMMARY_BADGE: Record<string, string> = {
  pending: "Resumo enviado — aguardando cliente",
  approved: "Cliente validou",
  contested: "Cliente contestou",
};

// Um mês: lista de lançamentos, com checkbox de seleção para faturar (a
// seleção é controlada pelo componente pai, HoursWorkspace, pois agora
// pode cruzar vários meses numa única fatura).
export function MonthGroupCard({
  quoteId,
  group,
  selected,
  onToggle,
}: {
  quoteId: string;
  group: MonthGroup;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function removeEntry(id: string) {
    startTransition(async () => {
      const res = await deleteHourEntry(id, quoteId);
      toast(res.ok ? "Lançamento excluído." : res.error, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border bg-surface shadow-card">
      <div className="border-b px-4 py-3">
        <p className="font-medium">{monthLabel(group.period)}</p>
        <p className="text-sm text-muted">{group.hours.toFixed(2)}h lançadas</p>
      </div>
      <ul className="divide-y">
        {group.entries.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
            {!e.sale_id && (
              <input
                type="checkbox"
                checked={selected.has(e.id)}
                onChange={() => onToggle(e.id)}
                className="h-4 w-4 shrink-0"
              />
            )}
            <span className="min-w-0 flex-1 break-words">
              <span className="tabular mr-2 text-muted">
                {new Date(e.entry_date + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
              <span className="tabular mr-2 font-medium">{e.hours.toFixed(2)}h</span>
              {e.description}
            </span>
            {e.sale_id ? (
              <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs">Faturado</span>
            ) : e.summaryStatus ? (
              <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs text-muted">
                {SUMMARY_BADGE[e.summaryStatus]}
              </span>
            ) : null}
            {!e.sale_id && (
              <button
                onClick={() => removeEntry(e.id)}
                disabled={pending}
                className="-my-2 shrink-0 py-2.5 text-xs text-danger disabled:opacity-50"
              >
                Excluir
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
