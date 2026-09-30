"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setHourlyContract } from "./hourly-actions";
import { parseBRLToCents, brl } from "@/lib/format";
import { useToast } from "@/components/toast";

const btn = "h-10 md:h-9 rounded-lg border px-4 text-sm font-medium transition hover:bg-subtle disabled:opacity-50";
const btnPrimary = "h-10 md:h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg transition hover:opacity-90 disabled:opacity-50";

// Ativa/mostra/desativa o contrato por hora de um orçamento aprovado.
export function HourlyToggle({
  quoteId,
  active,
  rateCents,
  suggestedRateCents,
  monthsSinceApproval,
}: {
  quoteId: string;
  active: boolean;
  rateCents: number | null;
  suggestedRateCents?: number | null;
  monthsSinceApproval?: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const needsReview = active && (monthsSinceApproval ?? 0) >= 3;

  function activate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const rate = parseBRLToCents(String(new FormData(e.currentTarget).get("rate") ?? ""));
    if (!rate) {
      setError("Informe o valor da hora.");
      return;
    }
    startTransition(async () => {
      const res = await setHourlyContract(quoteId, rate, true);
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast("Contrato por hora ativado.");
      setEditing(false);
      router.refresh();
    });
  }

  function deactivate() {
    if (
      !confirm(
        "Desativar o contrato por hora deste orçamento? O histórico de horas e as faturas já geradas não são apagados.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await setHourlyContract(quoteId, rateCents ?? 0, false);
      toast(res.ok ? "Contrato por hora desativado." : res.error, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  if (active) {
    return (
      <div className="space-y-3 rounded-lg border border-l-2 border-l-primary bg-primary-soft p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">Contrato por hora ativo</p>
            <p className="text-muted">Taxa: {brl(rateCents ?? 0)}/hora</p>
          </div>
          <button onClick={deactivate} disabled={pending} className="shrink-0 py-2 text-xs text-muted underline disabled:opacity-50">
            Desativar
          </button>
        </div>
        {needsReview && (
          <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            Este orçamento foi aprovado há {monthsSinceApproval} meses ou mais. Vale reavaliar a taxa e as condições com o cliente.
          </p>
        )}
        <Link href={`/orcamentos/${quoteId}/horas`} className={`${btnPrimary} inline-flex items-center`}>
          Lançar horas e faturar →
        </Link>
      </div>
    );
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className={btn}>
        Marcar como contrato por hora
      </button>
    );
  }

  const defaultRate = suggestedRateCents ? (suggestedRateCents / 100).toFixed(2).replace(".", ",") : "";

  return (
    <form onSubmit={activate} className="flex flex-wrap items-end gap-2 rounded-lg border bg-subtle p-3">
      <label className="space-y-1 text-xs text-muted">
        Valor da hora (R$)
        <input
          name="rate"
          inputMode="decimal"
          autoFocus
          defaultValue={defaultRate}
          placeholder="0,00"
          className="block h-10 md:h-9 w-32 rounded-md border bg-surface px-2 text-sm"
        />
      </label>
      {suggestedRateCents ? (
        <p className="basis-full text-xs text-muted">Valor sugerido a partir do item aprovado no orçamento — confira e ajuste se precisar.</p>
      ) : null}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Salvando..." : "Ativar"}
      </button>
      <button type="button" onClick={() => setEditing(false)} className={btn}>
        Cancelar
      </button>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </form>
  );
}
