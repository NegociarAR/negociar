import Link from "next/link";
import { listCompanies, companyCounts, pendingPlanRequests, expiredSubscriptions } from "@/modules/admin/queries";
import { PlanRequestActions } from "@/modules/admin/plan-request-actions";
import { AdminCompanyRow } from "@/modules/admin/admin-company-row";
import { PageIcon } from "@/components/page-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const [companies, counts, requests, expired] = await Promise.all([
    listCompanies(status, q),
    companyCounts(),
    pendingPlanRequests(),
    expiredSubscriptions(),
  ]);

  const tabs = [
    { key: "", label: "Todas" },
    { key: "pending", label: `Pendentes (${counts.pending})` },
    { key: "active", label: `Ativas (${counts.active})` },
    { key: "suspended", label: `Suspensas (${counts.suspended})` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <PageIcon module="admin" icon={Building2} />
        <h1 className="text-xl font-semibold">Empresas</h1>
      </div>

      {requests.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">
            Solicitações de plano{" "}
            <span className="text-muted">({requests.length})</span>
          </h2>
          <div className="divide-y rounded-lg border border-l-2 border-l-primary bg-surface">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="text-sm">
                  <span className="font-medium">{r.companyName}</span>
                  <span className="text-muted">
                    {" "}· {r.currentPlan ?? "—"} → <strong className="text-foreground">{r.requestedPlan}</strong>
                  </span>
                  {r.note && <p className="text-xs text-muted">{r.note}</p>}
                </div>
                <PlanRequestActions requestId={r.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      {expired.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">
            Assinaturas vencidas{" "}
            <span className="text-muted">({expired.length})</span>
          </h2>
          <div className="divide-y rounded-lg border border-l-2 border-l-danger bg-surface">
            {expired.map((e) => (
              <Link
                key={e.companyId}
                href={`/admin/empresas/${e.companyId}`}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm transition hover:bg-subtle"
              >
                <div className="min-w-0">
                  <span className="font-medium">{e.companyName}</span>
                  <span className="text-muted"> · plano {e.planName}</span>
                </div>
                <span className="text-xs text-danger">
                  venceu em {new Date(e.expiredAt).toLocaleDateString("pt-BR")}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => {
          const active = (status ?? "") === t.key;
          return (
            <Link
              key={t.key}
              href={t.key ? `/admin?status=${t.key}` : "/admin"}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm ${
                active
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <form method="get" className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome ou CNPJ..."
          className="h-9 flex-1 rounded-lg border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button type="submit" className="h-9 rounded-lg border bg-surface px-3 text-sm hover:bg-subtle">
          Buscar
        </button>
        {q && (
          <Link href={status ? `/admin?status=${status}` : "/admin"} className="h-9 rounded-lg border px-3 text-sm flex items-center hover:bg-subtle text-muted">
            Limpar
          </Link>
        )}
      </form>

      {companies.length === 0 ? (
        <EmptyState message="Nenhuma empresa neste filtro." />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-surface">
          <table className="block w-full text-sm sm:table">
            <thead className="hidden sm:table-header-group">
              <tr className="border-b text-left text-muted">
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium">Cadastro</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="block sm:table-row-group">
              {companies.map((c) => (
                <AdminCompanyRow key={c.id} c={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
