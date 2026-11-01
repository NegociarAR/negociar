import Link from "next/link";
import {
  getFunnel,
  getRevenue,
  getReasons,
  getReceivablesSummary,
  getSalesBySalesperson,
  periodStart,
  PERIOD_LABELS,
  type Period,
} from "@/modules/relatorios/queries";
import { getLeadFunnel, getLeadLossReasons } from "@/modules/relatorios/lead-queries";
import { getCashFlowProjection } from "@/modules/relatorios/cashflow-queries";
import { getEntitlements, hasModule } from "@/lib/entitlements";
import { STATUS_LABELS } from "@/modules/orcamentos/types";
import { brl } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { PageIcon } from "@/components/page-icon";
import { BarChart2 } from "lucide-react";

const PERIODS: Period[] = ["month", "quarter", "year"];

// ordem do funil
const FUNNEL_ORDER = ["draft", "sent", "viewed", "negotiation_requested", "approved", "rejected", "canceled"];

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${names[Number(m) - 1]}/${y.slice(2)}`;
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: Period }>;
}) {
  const { periodo } = await searchParams;
  const period: Period = periodo && ["month", "quarter", "year"].includes(periodo) ? periodo : "month";

  const ents = await getEntitlements();
  const showLeads = hasModule(ents, "clientes");
  const showCashflow = hasModule(ents, "orcamentos");
  const [funnel, revenue, reasons, receivables, leads, lossReasons, cashflow, salespersons] = await Promise.all([
    getFunnel(period),
    getRevenue(period),
    getReasons(period),
    getReceivablesSummary(period),
    showLeads ? getLeadFunnel(period) : Promise.resolve(null),
    showLeads ? getLeadLossReasons(period) : Promise.resolve([]),
    showCashflow ? getCashFlowProjection() : Promise.resolve([]),
    showCashflow ? getSalesBySalesperson(period) : Promise.resolve([]),
  ]);

  // cashflow stats
  const confirmed30 = cashflow.slice(0, 4).reduce((s, w) => s + w.confirmedCents, 0);
  const projectedTotal = cashflow.reduce((s, w) => s + w.projectedCents, 0);
  const maxCashflow = Math.max(1, ...cashflow.map((w) => w.confirmedCents + w.projectedCents));

  const maxFunnel = Math.max(1, ...Object.values(funnel.byStatus));
  const maxMonth = Math.max(1, ...revenue.byMonth.map((m) => m.cents));
  const maxReason = Math.max(1, ...reasons.map((r) => r.count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PageIcon module="orcamentos" icon={BarChart2} />
          <h1 className="text-xl font-semibold">Relatórios</h1>
        </div>
        <div className="flex gap-1 text-sm">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/relatorios?periodo=${p}`}
              className={`rounded-md px-3 py-1.5 ${
                period === p ? "bg-primary text-primary-fg" : "text-muted hover:text-foreground"
              }`}
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
      </div>

      {/* 2. FATURAMENTO (topo, cards) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Faturamento</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Total vendido"
            value={brl(revenue.totalCents)}
            sub={
              revenue.variancePct === null
                ? undefined
                : `${revenue.variancePct >= 0 ? "+" : ""}${revenue.variancePct.toFixed(0)}% vs período anterior`
            }
            danger={revenue.variancePct !== null && revenue.variancePct < 0}
          />
          <StatCard label="Vendas" value={String(revenue.count)} />
          <StatCard label="Ticket médio" value={brl(revenue.avgTicketCents)} />
        </div>
        {revenue.byMonth.length > 0 && (
          <div className="space-y-2 rounded-lg border bg-surface p-5 shadow-card">
            {revenue.byMonth.map((m) => (
              <div key={m.month} className="flex items-center gap-3 text-sm">
                <span className="w-14 shrink-0 text-muted">{monthLabel(m.month)}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-subtle">
                  <div className="h-full rounded-full bg-module-orcamentos" style={{ width: `${(m.cents / maxMonth) * 100}%` }} />
                </div>
                <span className="tabular w-24 shrink-0 text-right">{brl(m.cents)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 1. FUNIL */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Funil de conversão</h2>
          <span className="text-sm text-muted">
            Conversão: <strong className="text-foreground">{funnel.conversion.toFixed(0)}%</strong>{" "}
            ({funnel.won} de {funnel.sent} enviados)
          </span>
        </div>
        <div className="space-y-2 rounded-lg border bg-surface p-5 shadow-card">
          {FUNNEL_ORDER.filter((s) => funnel.byStatus[s]).map((s) => (
            <div key={s} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 text-muted">{STATUS_LABELS[s as keyof typeof STATUS_LABELS] ?? s}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-subtle">
                <div
                  className={`h-full rounded-full ${s === "approved" ? "bg-module-orcamentos" : "bg-module-orcamentos/30"}`}
                  style={{ width: `${(funnel.byStatus[s] / maxFunnel) * 100}%` }}
                />
              </div>
              <span className="tabular w-8 shrink-0 text-right">{funnel.byStatus[s]}</span>
            </div>
          ))}
          {funnel.total === 0 && <p className="text-sm text-muted">Sem orçamentos no período.</p>}
        </div>
      </section>

      {/* LEADS -> CLIENTES */}
      {leads && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Leads e conversão</h2>
            <span className="text-sm text-muted">
              Conversão: <strong className="text-foreground">{leads.rate.toFixed(0)}%</strong> ({leads.converted} de {leads.leads})
            </span>
          </div>
          <div className="space-y-2 rounded-lg border bg-surface p-5 shadow-card">
            {leads.steps.map((s, i) => {
              const max = Math.max(1, leads.steps[0].count);
              const prevCount = i > 0 ? leads.steps[i - 1].count : null;
              const stepRate = prevCount && prevCount > 0 ? (s.count / prevCount) * 100 : null;
              return (
                <div key={s.key} className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0 text-muted">{s.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-subtle">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(s.count / max) * 100}%` }} />
                  </div>
                  <span className="tabular w-10 shrink-0 text-right">{s.count}</span>
                  <span className="w-12 shrink-0 text-right text-xs text-muted">
                    {stepRate !== null ? `${stepRate.toFixed(0)}%` : ""}
                  </span>
                </div>
              );
            })}
            {leads.lost > 0 && (
              <p className="pt-1 text-xs text-muted">{leads.lost} lead(s) perdido(s) no período.</p>
            )}
          </div>
          <div className="rounded-lg border bg-surface p-5 shadow-card">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Por origem</p>
            {leads.bySource.length === 0 ? (
              <p className="text-sm text-muted">Nenhum lead no período.</p>
            ) : (
              <ul className="space-y-2">
                {leads.bySource.map((s) => (
                  <li key={s.source} className="flex items-center gap-3 text-sm">
                    <span className="w-36 shrink-0 text-muted">{s.source}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-subtle">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${s.total ? (s.converted / s.total) * 100 : 0}%` }} />
                    </div>
                    <span className="tabular w-16 shrink-0 text-right">{s.converted}/{s.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* MOTIVOS DE LEAD PERDIDO */}
      {showLeads && lossReasons.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Por que perdemos leads</h2>
          <div className="rounded-lg border bg-surface p-5 shadow-card">
            <ul className="space-y-2">
              {lossReasons.map((r, i) => {
                const max = Math.max(1, ...lossReasons.map((x) => x.count));
                return (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="flex-1">{r.reason}</span>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-subtle">
                      <div className="h-full rounded-full bg-danger/60" style={{ width: `${(r.count / max) * 100}%` }} />
                    </div>
                    <span className="tabular w-6 text-right">{r.count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* 3. MOTIVOS */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Motivos de recusa e negociação</h2>
        <div className="rounded-lg border bg-surface p-5 shadow-card">
          {reasons.length === 0 ? (
            <p className="text-sm text-muted">Nenhum motivo registrado no período.</p>
          ) : (
            <ul className="space-y-2">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="flex-1">
                    {r.reason}
                    <span className="ml-2 text-xs text-muted">
                      {r.kind === "rejected" ? "recusa" : "negociação"}
                    </span>
                  </span>
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-subtle">
                    <div className="h-full rounded-full bg-module-orcamentos/50" style={{ width: `${(r.count / maxReason) * 100}%` }} />
                  </div>
                  <span className="tabular w-6 text-right">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 5. PROJEÇÃO DE CAIXA */}
      {showCashflow && cashflow.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Projeção de caixa (90 dias)</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Confirmado (30 dias)" value={brl(confirmed30)} />
            <StatCard label="Projetado (recorrências)" value={brl(projectedTotal)} />
          </div>
          <div className="space-y-2 rounded-lg border bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-success" />
                Confirmado (parcelas)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary/40" />
                Projetado (recorrências)
              </span>
            </div>
            {cashflow.map((w) => {
              const total = w.confirmedCents + w.projectedCents;
              const confirmedPct = (w.confirmedCents / maxCashflow) * 100;
              const projectedPct = (w.projectedCents / maxCashflow) * 100;
              const [d, m] = w.weekStart.split("-").slice(1).concat(w.weekStart.split("-")[2]);
              const label = `${w.weekStart.slice(8)}/${w.weekStart.slice(5, 7)}`;
              return (
                <div key={w.weekStart} className="flex items-center gap-3 text-sm">
                  <span className="w-12 shrink-0 text-xs text-muted">{label}</span>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-subtle">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-success"
                      style={{ width: `${confirmedPct}%` }}
                    />
                    <div
                      className="absolute top-0 h-full rounded-full bg-primary/40"
                      style={{ left: `${confirmedPct}%`, width: `${projectedPct}%` }}
                    />
                  </div>
                  <span className="tabular w-24 shrink-0 text-right text-xs">
                    {total > 0 ? brl(total) : <span className="text-muted">—</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. PERFORMANCE POR VENDEDOR */}
      {showCashflow && salespersons.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Performance por vendedor</h2>
          <div className="overflow-x-auto rounded-lg border bg-surface shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted">
                  <th className="px-4 py-3 text-left font-medium">Vendedor</th>
                  <th className="px-4 py-3 text-right font-medium">Orçamentos</th>
                  <th className="px-4 py-3 text-right font-medium">Enviados</th>
                  <th className="px-4 py-3 text-right font-medium">Aprovados</th>
                  <th className="px-4 py-3 text-right font-medium">Conversão</th>
                  <th className="px-4 py-3 text-right font-medium">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {salespersons.map((sp) => (
                  <tr key={sp.salespersonId ?? "__null__"} className="hover:bg-subtle">
                    <td className="max-w-[180px] truncate px-4 py-3 font-medium">
                      {sp.email}
                    </td>
                    <td className="px-4 py-3 text-right tabular">{sp.quotesCount}</td>
                    <td className="px-4 py-3 text-right tabular">{sp.sentCount}</td>
                    <td className="px-4 py-3 text-right tabular">{sp.wonCount}</td>
                    <td className="px-4 py-3 text-right tabular">
                      {sp.sentCount > 0 ? `${sp.conversion.toFixed(0)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular">{brl(sp.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 4. RECEBÍVEIS */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Recebíveis</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="A receber" value={brl(receivables.toReceiveCents)} />
          <StatCard label="Vencido" value={brl(receivables.overdueCents)} danger={receivables.overdueCents > 0} />
          <StatCard label="Recebido no período" value={brl(receivables.receivedCents)} />
        </div>
      </section>
    </div>
  );
}
