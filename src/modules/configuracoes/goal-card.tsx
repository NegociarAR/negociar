"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMonthlyGoal } from "./goals-actions";
import { brl, parseBRLToCents } from "@/lib/format";
import { useToast } from "@/components/toast";
import type { GoalProgress } from "./goals-types";

const LABELS: Record<GoalProgress["metric"], string> = { revenue: "Vendas do mês", new_customers: "Novos clientes" };

function formatValue(metric: GoalProgress["metric"], n: number) {
  return metric === "revenue" ? brl(n) : String(n);
}

// Card de progresso de uma meta mensal. Sem meta definida: convite curto
// pra definir. Com meta: barra de progresso + "definir de novo" discreto.
export function GoalCard({ goal }: { goal: GoalProgress }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const raw = String(new FormData(e.currentTarget).get("value") ?? "");
    const value = goal.metric === "revenue" ? parseBRLToCents(raw) / 100 : Number(raw.replace(",", "."));
    if (!(value > 0)) {
      setError("Informe um valor maior que zero.");
      return;
    }
    startTransition(async () => {
      const res = await setMonthlyGoal(goal.metric, goal.period, value);
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast("Meta salva.");
      setEditing(false);
      router.refresh();
    });
  }

  if (goal.target === null && !editing) {
    return (
      <div className="rounded-lg border border-dashed bg-surface p-4 text-sm">
        <p className="font-medium">{LABELS[goal.metric]}</p>
        <p className="mt-0.5 text-muted">{formatValue(goal.metric, goal.actual)} até agora — sem meta definida.</p>
        <button onClick={() => setEditing(true)} className="mt-2 text-xs font-medium text-primary hover:underline">
          Definir meta do mês
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <form onSubmit={submit} className="rounded-lg border bg-surface p-4 text-sm shadow-card">
        <p className="mb-2 font-medium">{LABELS[goal.metric]}</p>
        <div className="flex items-center gap-2">
          <input
            name="value"
            autoFocus
            inputMode={goal.metric === "revenue" ? "decimal" : "numeric"}
            defaultValue={goal.metric === "revenue" && goal.target ? (goal.target / 100).toFixed(2).replace(".", ",") : goal.target ?? ""}
            placeholder={goal.metric === "revenue" ? "0,00" : "0"}
            className="h-9 w-28 rounded-md border bg-surface px-2 text-sm"
          />
          <button type="submit" disabled={pending} className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-fg disabled:opacity-50">
            {pending ? "..." : "Salvar"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="h-9 rounded-md border px-3 text-xs">
            Cancelar
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </form>
    );
  }

  const pct = goal.pct ?? 0;
  const over = goal.actual >= (goal.target ?? 0);

  return (
    <div className="rounded-lg border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{LABELS[goal.metric]}</p>
        <button onClick={() => setEditing(true)} className="text-xs text-muted hover:text-foreground">
          editar
        </button>
      </div>
      <p className="tabular mt-1 text-lg font-semibold">
        {formatValue(goal.metric, goal.actual)}{" "}
        <span className="text-sm font-normal text-muted">de {formatValue(goal.metric, goal.target ?? 0)}</span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-subtle">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-success" : "bg-primary"}`}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">{pct.toFixed(0)}% da meta</p>
    </div>
  );
}
