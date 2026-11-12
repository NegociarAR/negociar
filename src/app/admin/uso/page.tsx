import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/admin/queries";
import {
  getBusinessOverview,
  getFeatureAdoption,
  getTopActiveCompanies,
  getTechnicalHealth,
} from "@/modules/admin/usage-queries";
import { BackLink } from "@/components/back-link";
import { PageIcon } from "@/components/page-icon";
import { BarChart2 } from "lucide-react";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-surface p-4 space-y-1">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function PctBar({ label, pct, used, total }: { label: string; pct: number; used: number; total: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">{used}/{total} — {pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-subtle">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
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

  const totalCompanies = overview.counts.pending + overview.counts.active + overview.counts.suspended;

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total de empresas" value={totalCompanies} />
          <StatTile label="Ativas" value={overview.counts.active} />
          <StatTile label="Novas (30 dias)" value={overview.newLast30} />
          <StatTile label="MRR estimado" value={brl(overview.mrrCents)} />
        </div>

        {/* por status */}
        <div className="rounded-lg border bg-surface p-4 space-y-2">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">Por status</p>
          <div className="flex flex-wrap gap-4 text-sm">
            {[
              { label: "Pendentes", count: overview.counts.pending },
              { label: "Ativas", count: overview.counts.active },
              { label: "Suspensas", count: overview.counts.suspended },
            ].map((s) => (
              <span key={s.label} className="tabular-nums">
                <span className="text-muted">{s.label}: </span>
                <strong>{s.count}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* por plano */}
        {overview.byPlan.length > 0 && (
          <div className="rounded-lg border bg-surface p-4 space-y-2">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Por plano</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {overview.byPlan.map((p) => (
                <span key={p.plan_id} className="tabular-nums">
                  <span className="text-muted">{p.plan_name}: </span>
                  <strong>{p.count}</strong>
                </span>
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
              <PctBar key={f.feature} label={f.feature} pct={f.pct} used={f.usedCount} total={f.totalActive} />
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
                      <Link href={`/admin/empresas/${r.companyId}`} className="font-medium hover:underline">
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
                    <span className="font-medium">{e.companyName}</span>
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
        <div className="rounded-lg border bg-surface p-4 flex items-center justify-between gap-4">
          <p className="text-sm">Parcelas vencidas há +30 dias sem receber</p>
          <span className={`tabular-nums font-semibold text-lg ${health.overdueInstallments > 0 ? "text-danger" : "text-success"}`}>
            {health.overdueInstallments}
          </span>
        </div>

        {/* Cron */}
        <p className="text-xs text-muted">{health.cronNote}</p>
      </section>
    </div>
  );
}
