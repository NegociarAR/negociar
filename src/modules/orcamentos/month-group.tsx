"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteHourEntry, generateHourlyInvoice } from "./hourly-actions";
import { brl } from "@/lib/format";
import { todayBRT } from "@/lib/period";
import { useToast } from "@/components/toast";
import type { MonthGroup } from "./hourly-types";

const STATUS_LABEL: Record<string, string> = { pending: "Pendente", received: "Recebida", overdue: "Vencida" };
const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[Number(m) - 1]}/${y}`;
}

// Um mês: total de horas lançadas, e a ação de gerar a fatura (ou o
// resultado, se já foi gerada).
export function MonthGroupCard({
  quoteId,
  group,
  rateCents,
}: {
  quoteId: string;
  group: MonthGroup;
  rateCents: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [dueDate, setDueDate] = useState(todayBRT());
  const [error, setError] = useState<string | null>(null);

  function removeEntry(id: string) {
    startTransition(async () => {
      const res = await deleteHourEntry(id, quoteId);
      toast(res.ok ? "Lançamento excluído." : res.error, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  function generate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await generateHourlyInvoice(quoteId, group.period, dueDate);
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast(`Fatura de ${monthLabel(group.period)} gerada e enviada para Recebíveis.`);
      setGenerating(false);
      router.refresh();
    });
  }

  const estimate = Math.round(group.hours * rateCents);

  return (
    <div className="rounded-lg border bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <p className="font-medium">{monthLabel(group.period)}</p>
          <p className="text-sm text-muted">
            {group.hours.toFixed(2)}h × {brl(rateCents)} = {brl(estimate)}
          </p>
        </div>
        {group.invoiced ? (
          <span className="rounded-full border px-2.5 py-0.5 text-xs">
            Faturado — {brl(group.invoiceTotalCents ?? 0)} · {STATUS_LABEL[group.invoiceStatus ?? "pending"]}
          </span>
        ) : group.hours > 0 ? (
          generating ? (
            <form onSubmit={generate} className="flex items-center gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 rounded-md border bg-surface px-2 text-xs"
              />
              <button type="submit" disabled={pending} className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-fg disabled:opacity-50">
                Confirmar
              </button>
              <button type="button" onClick={() => setGenerating(false)} className="h-8 rounded-md border px-2 text-xs">
                x
              </button>
            </form>
          ) : (
            <button onClick={() => setGenerating(true)} className="h-8 rounded-md border px-3 text-xs font-medium hover:bg-subtle">
              Gerar fatura do mês
            </button>
          )
        ) : null}
      </div>
      {error && <p className="px-4 pt-2 text-xs text-danger">{error}</p>}
      {group.entries.length > 0 && (
        <ul className="divide-y">
          {group.entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <span className="min-w-0">
                <span className="tabular mr-2 text-muted">
                  {new Date(e.entry_date + "T00:00:00").toLocaleDateString("pt-BR")}
                </span>
                <span className="tabular mr-2 font-medium">{Number(e.hours).toFixed(2)}h</span>
                {e.description}
              </span>
              {!group.invoiced && (
                <button onClick={() => removeEntry(e.id)} disabled={pending} className="shrink-0 text-xs text-danger disabled:opacity-50">
                  Excluir
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
