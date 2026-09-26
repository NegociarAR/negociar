"use client";

import {
  approveCompany,
  suspendCompany,
  reactivateCompany,
  changePlan,
  setPeriodEnd,
} from "@/modules/admin/actions";

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
  const approve = approveCompany.bind(null, companyId);
  const suspend = suspendCompany.bind(null, companyId);
  const reactivate = reactivateCompany.bind(null, companyId);

  return (
    <div className="space-y-5">
      {/* status */}
      <div className="flex flex-wrap gap-2">
        {status === "pending" && (
          <form action={approve}>
            <button className="h-9 rounded-lg bg-foreground px-4 text-sm font-medium text-background">
              Aprovar acesso
            </button>
          </form>
        )}
        {status === "active" && (
          <form action={suspend}>
            <button className="h-9 rounded-lg border px-4 text-sm font-medium">
              Suspender
            </button>
          </form>
        )}
        {status === "suspended" && (
          <form action={reactivate}>
            <button className="h-9 rounded-lg bg-foreground px-4 text-sm font-medium text-background">
              Reativar
            </button>
          </form>
        )}
      </div>

      {/* plano */}
      <form
        action={async (fd: FormData) => {
          await changePlan(companyId, String(fd.get("plan_id")));
        }}
        className="flex items-end gap-2"
      >
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
        <button className="h-9 rounded-lg border px-4 text-sm font-medium">
          Salvar plano
        </button>
      </form>

      {/* vencimento */}
      <form
        action={async (fd: FormData) => {
          await setPeriodEnd(companyId, String(fd.get("period_end")));
        }}
        className="flex items-end gap-2"
      >
        <label className="space-y-1.5">
          <span className="block text-sm font-medium">
            Vencimento (pagamento)
          </span>
          <input
            type="date"
            name="period_end"
            defaultValue={periodEnd ? periodEnd.slice(0, 10) : ""}
            className="h-9 rounded-lg border bg-surface px-3 text-sm"
          />
        </label>
        <button className="h-9 rounded-lg border px-4 text-sm font-medium">
          Salvar vencimento
        </button>
      </form>
    </div>
  );
}
