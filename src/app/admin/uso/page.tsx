import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/admin/queries";
import {
  getBusinessOverview,
  getFeatureAdoption,
  getTopActiveCompanies,
  getTechnicalHealth,
} from "@/modules/admin/usage-queries";
import { DrilldownTrigger } from "@/modules/admin/drilldown-panel";
import { BackLink } from "@/components/back-link";
import { PageIcon } from "@/components/page-icon";
import { BarChart2 } from "lucide-react";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function StatTileInner({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-surface p-4 space-y-1 hover:bg-subtle transition cursor-pointer">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted">clique para ver lista →</p>
    </div>
  );
}

export default async function AdminUsoPage() {
  const admin = await requireAdmin();
  if (!admin) notFound();

  const [overview, adoption, ranking, health] = await Promise.all([
    getBusinessOverview(),
    getFeatureAdoption(),
    getTopActiveCompanies(30, 15),
    getTechnicalHealth(),
  ]);

  if (!overview || !adoption || !ranking || !health) notFound();

  const totalCompanies =
    overview.counts.pending + overview.counts.active + overview.counts.suspended;

  const totalRows = [
    ...overview.companiesByStatus.pending,
    ...overview.companiesByStatus.active,
    ...overview.companiesByStatus.suspended,
  ].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-8">
      <BackLink href="/admin" label="Voltar para empresas" />

      <header className="flex items-center gap-3">
        <PageIcon module="admin" icon={BarChart2} />
        <h1 className="text-xl font-semibold">Uso da plataforma</h1>
      </header>

      {/* 1. Visão geral */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Visão geral de negócio</h2>

        {/* Tiles clicáveis */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DrilldownTrigger
            title="Todas as empresas"
            count={totalCompanies}
            rows={totalRows}
          >
            <StatTileInner label="Total de empresas" value={totalCompanies} />
          </DrilldownTrigger>

          <DrilldownTrigger
            title="Empresas ativas"
            count={overview.counts.active}
            rows={overview.companiesByStatus.active}
          >
            <StatTileInner label="Ativas" value={overview.counts.active} />
          </DrilldownTrigger>

          <DrilldownTrigger
            title="Novas (últimos 30 dias)"
            count={overview.newLast30}
            rows={overview.newCompanies.map((c) => ({
              id: c.id,
              label: c.label,
              detail: c.detail,
            }))}
          >
            <StatTileInner label="Novas (30 dias)" value={overview.newLast30} />
          </DrilldownTrigger>

          <DrilldownTrigger
            title="Assinaturas pagantes (MRR)"
            count={overview.payingSubscriptions.length}
            rows={overview.payingSubscriptions}
          >
            <StatTileInner label="MRR estimado" value={brl(overview.mrrCents)} />
          </DrilldownTrigger>
        </div>

        {/* por status */}
        <div className="rounded-lg border bg-surface p-4 space-y-2">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">Por status</p>
          <div className="flex flex-wrap gap-4 text-sm">
            {(["pending", "active", "suspended"] as const).map((st) => {
              const labels: Record<string, string> = {
                pending: "Pendentes",
                active: "Ativas",
                suspended: "Suspensas",
              };
              return (
                <DrilldownTrigger
                  key={st}
                  title={labels[st]}
                  count={overview.counts[st]}
                  rows={overview.companiesByStatus[st]}
                >
                  <span className="tabular-nums hover:underline cursor-pointer">
                    <span className="text-muted">{labels[st]}: </span>
                    <strong>{overview.counts[st]}</strong>
                  </span>
                </DrilldownTrigger>
              );
            })}
          </div>
        </div>

        {/* por plano */}
        {overview.byPlan.length > 0 && (
          <div className="rounded-lg border bg-surface p-4 space-y-2">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Por plano</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {overview.byPlan.map((p) => (
                <DrilldownTrigger
                  key={p.plan_id}
                  title={p.plan_name}
                  count={p.count}
                  rows={p.companies}
                >
                  <span className="tabular-nums hover:underline cursor-pointer">
                    <span className="text-muted">{p.plan_name}: </span>
                    <strong>{p.count}</strong>
                  </span>
                </DrilldownTrigger>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2. Adoção de funcionalidades */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Adoção de funcionalidades</h2>
        <div className="rounded-lg border bg-surface p-5 space-y-4">
          {adoption.length === 0 ? (
            <p className="text-sm text-muted">Sem dados de empresas ativas.</p>
          ) : (
            adoption.map((f) => (
              <DrilldownTrigger
                key={f.feature}
                title={f.feature}
                count={f.usedCount}
                rows={f.companies}
              >
                <div className="space-y-1 text-left">
                  <div className="flex justify-between text-sm">
                    <span className="hover:underline">{f.feature}</span>
                    <span className="tabular-nums text-muted">
                      {f.usedCount}/{f.totalActive} — {f.pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-subtle">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${f.pct}%` }}
                    />
                  </div>
                </div>
              </DrilldownTrigger>
            ))
          )}
        </div>
      </section>

      {/* 3. Ranking de empresas mais ativas */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Empresas mais ativas (últimos 30 dias)</h2>
        <div className="overflow-hidden rounded-lg border bg-surface">
          {ranking.length === 0 ? (
            <p className="p-5 text-sm text-muted">Nenhuma atividade registrada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ranking.map((r, i) => (
                  <tr key={r.companyId} className="hover:bg-subtle transition">
                    <td className="px-4 py-3 text-muted">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/empresas/${r.companyId}`}
                        className="font-medium hover:underline"
                      >
                        {r.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.actions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 4. Saúde técnica */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Saúde técnica</h2>

        {/* Notas fiscais com erro */}
        <div className="rounded-lg border bg-surface p-5 space-y-3">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">
            Notas fiscais com erro ({health.invoiceErrors.length})
          </p>
          {health.invoiceErrors.length === 0 ? (
            <p className="text-sm text-muted">Nenhum problema encontrado.</p>
          ) : (
            <ul className="divide-y text-sm">
              {health.invoiceErrors.map((e, i) => (
                <li key={i} className="py-2 flex flex-wrap justify-between gap-2">
                  <div>
                    <Link
                      href={`/admin/empresas/${e.companyId}`}
                      className="font-medium hover:underline"
                    >
                      {e.companyName}
                    </Link>
                    {e.errorMessage && (
                      <p className="text-xs text-danger mt-0.5 max-w-prose">{e.errorMessage}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted tabular-nums">{fmtDate(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Parcelas vencidas */}
        <div className="rounded-lg border bg-surface p-5 space-y-3">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">
            Parcelas vencidas há +30 dias ({health.overdueInstallments})
          </p>
          {health.overdueList.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma parcela em atraso.</p>
          ) : (
            <ul className="divide-y text-sm max-h-64 overflow-y-auto">
              {health.overdueList.map((inst, i) => (
                <li key={i} className="py-2 flex flex-wrap justify-between gap-2">
                  <Link
                    href={`/admin/empresas/${inst.companyId}`}
                    className="font-medium hover:underline"
                  >
                    {inst.companyName}
                  </Link>
                  <span className="text-xs text-muted tabular-nums">
                    venc. {inst.dueDate} · {brl(inst.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cron */}
        <p className="text-xs text-muted">{health.cronNote}</p>
      </section>
    </div>
  );
}
