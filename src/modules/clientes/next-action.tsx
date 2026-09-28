"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { finishNextAction, scheduleNextAction } from "./lead-actions";
import { ACTION_KINDS } from "./stages";
import { todayBRT } from "@/lib/period";

function fmt(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Próxima ação do contato: o que precisa ser feito, quando, e como agendar.
export function NextAction({
  customerId,
  actions,
}: {
  customerId: string;
  actions: { id: string; dueDate: string; reason: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const today = todayBRT();

  function finish(id: string) {
    startTransition(async () => {
      const res = await finishNextAction(id, customerId);
      if (res.ok) toast("Ação concluída.");
      else toast(res.error, "error");
      router.refresh();
    });
  }

  function schedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const res = await scheduleNextAction(
        customerId,
        String(f.get("kind") ?? "other"),
        String(f.get("date") ?? ""),
        String(f.get("note") ?? ""),
      );
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast("Ação agendada.");
      form.reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Próxima ação</h3>
      {actions.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma ação agendada. Defina o próximo passo.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {actions.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className={`tabular mr-2 font-medium ${a.dueDate < today ? "text-danger" : ""}`}>{fmt(a.dueDate)}</span>
                {a.reason}
              </span>
              <button
                onClick={() => finish(a.id)}
                disabled={pending}
                className="shrink-0 text-xs font-medium underline disabled:opacity-50"
              >
                Concluir
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={schedule} className="flex flex-wrap items-end gap-2">
        <select name="kind" className="h-8 rounded-md border bg-surface px-2 text-sm">
          {ACTION_KINDS.map((k) => (
            <option key={k.key} value={k.key}>{k.label}</option>
          ))}
        </select>
        <input type="date" name="date" required defaultValue={today} className="h-8 rounded-md border bg-surface px-2 text-sm" />
        <input name="note" placeholder="Observação (opcional)" className="h-8 min-w-40 flex-1 rounded-md border bg-surface px-2 text-sm" />
        <button type="submit" disabled={pending} className="h-8 rounded-md border px-3 text-xs font-medium hover:bg-subtle disabled:opacity-50">
          Agendar
        </button>
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
