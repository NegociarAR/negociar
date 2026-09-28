"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveCompany,
  suspendCompany,
  reactivateCompany,
  changePlan,
  setPeriodEnd,
} from "@/modules/admin/actions";
import { useToast } from "@/components/toast";

const btn = "h-9 rounded-lg border px-4 text-sm font-medium transition hover:bg-subtle disabled:opacity-50";
const btnPrimary = "h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg transition hover:opacity-90 disabled:opacity-50";

export function AdminActions({
  companyId,
  status,
  planId,
  periodEnd,
  plans,
}: {
  companyId: string;
  status: string;
  planId: string | null;
  periodEnd: string | null;
  plans: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  // executa a ação, avisa o resultado e atualiza a tela
  function run(fn: () => Promise<unknown>, okMsg: string) {
    startTransition(async () => {
      try {
        await fn();
        toast(okMsg);
        router.refresh();
      } catch (e) {
        toast(e instanceof Error && e.message ? e.message : "Não foi possível salvar. Tente novamente.", "error");
      }
    });
  }

  function savePlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = String(new FormData(e.currentTarget).get("plan_id"));
    const name = plans.find((p) => p.id === id)?.name ?? id;
    run(() => changePlan(companyId, id), `Plano alterado para ${name}.`);
  }

  function savePeriod(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = String(new FormData(e.currentTarget).get("period_end") ?? "");
    const msg = v ? `Vencimento atualizado para ${new Date(v + "T00:00:00").toLocaleDateString("pt-BR")}.` : "Vencimento removido.";
    run(() => setPeriodEnd(companyId, v), msg);
  }

  return (
    <div className="space-y-5">
      {/* status */}
      <div className="flex flex-wrap gap-2">
        {status === "pending" && (
          <button disabled={pending} className={btnPrimary} onClick={() => run(() => approveCompany(companyId), "Acesso aprovado.")}>
            Aprovar acesso
          </button>
        )}
        {status === "active" && (
          <button
            disabled={pending}
            className={btn}
            onClick={() => confirm("Suspender o acesso desta empresa?") && run(() => suspendCompany(companyId), "Empresa suspensa.")}
          >
            Suspender
          </button>
        )}
        {status === "suspended" && (
          <button disabled={pending} className={btnPrimary} onClick={() => run(() => reactivateCompany(companyId), "Empresa reativada.")}>
            Reativar
          </button>
        )}
      </div>

      {/* plano */}
      <form onSubmit={savePlan} className="flex items-end gap-2">
        <label className="space-y-1.5">
          <span className="block text-sm font-medium">Plano</span>
          <select
            name="plan_id"
            defaultValue={planId ?? ""}
            className="h-9 rounded-lg border bg-surface px-3 text-sm"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button disabled={pending} className={btn}>
          {pending ? "Salvando..." : "Salvar plano"}
        </button>
      </form>

      {/* vencimento */}
      <form onSubmit={savePeriod} className="flex items-end gap-2">
        <label className="space-y-1.5">
          <span className="block text-sm font-medium">Vencimento (pagamento)</span>
          <input
            type="date"
            name="period_end"
            defaultValue={periodEnd ? periodEnd.slice(0, 10) : ""}
            className="h-9 rounded-lg border bg-surface px-3 text-sm"
          />
        </label>
        <button disabled={pending} className={btn}>
          {pending ? "Salvando..." : "Salvar vencimento"}
        </button>
      </form>
    </div>
  );
}
