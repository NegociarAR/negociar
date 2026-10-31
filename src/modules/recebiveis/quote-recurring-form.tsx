"use client";

import { useState, useTransition } from "react";
import { brl } from "@/lib/format";
import { createRecurringCharge } from "@/modules/recebiveis/recurring-actions";
import type { RecurringCharge } from "@/modules/recebiveis/recurring-actions";

interface Props {
  quoteId: string;
  customerId: string;
  description: string;
  amountCents: number;
  existingCharge: RecurringCharge | null;
}

export function QuoteRecurringForm({ quoteId, customerId, description, amountCents, existingCharge }: Props) {
  const [dayOfMonth, setDayOfMonth] = useState(existingCharge?.day_of_month ?? 5);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (existingCharge) {
    return (
      <div className="rounded-lg border border-l-2 border-l-success bg-success-soft p-4 text-sm">
        <p className="font-medium">Cobrança recorrente ativa</p>
        <p className="mt-1 text-muted">
          {brl(existingCharge.amount_cents)} / mês · todo dia {existingCharge.day_of_month} ·{" "}
          {existingCharge.active ? "ativa" : "pausada"}
        </p>
        <p className="mt-1 text-xs text-muted">Gerencie em Recebíveis → Recorrências.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-lg border border-l-2 border-l-success bg-success-soft p-4 text-sm">
        <p className="font-medium">Cobrança recorrente criada!</p>
        <p className="mt-1 text-muted">Gerencie em Recebíveis → Recorrências.</p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createRecurringCharge({
        customerId,
        description,
        amountCents,
        dayOfMonth,
        quoteId,
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(res.error ?? "Erro desconhecido.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-surface p-4 text-sm">
      <p className="font-medium">Criar cobrança recorrente</p>
      <p className="text-muted">
        {description} · {brl(amountCents)}/mês
      </p>
      <div className="flex items-center gap-3">
        <label className="shrink-0 text-muted">Todo dia</label>
        <input
          type="number"
          min={1}
          max={28}
          value={dayOfMonth}
          onChange={(e) => setDayOfMonth(Number(e.target.value))}
          className="w-20 rounded border bg-subtle px-2 py-1 text-center"
          required
        />
        <span className="text-muted">de cada mês</span>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Criando…" : "Criar recorrência"}
      </button>
    </form>
  );
}
