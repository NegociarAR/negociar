import Link from "next/link";
import {
  getFunnel,
  getRevenue,
  getReasons,
  getReceivablesSummary,
  periodStart,
  PERIOD_LABELS,
  type Period,
} from "@/modules/relatorios/queries";
import { getLeadFunnel } from "@/modules/relatorios/lead-queries";
import { getEntitlements, hasModule } from "@/lib/entitlements";
import { STATUS_LABELS } from "@/modules/orcamentos/types";
import { brl } from "@/lib/format";

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

  const showLeads = hasModule(await getEntitlements(), "clientes");
  const [funnel, revenue, reasons, receivables, leads] = await Promise.all([
    getFunnel(period),
    getRevenue(period),
    getReasons(period),
    getReceivablesSummary(period),
    showLeads ? getLeadFunnel(period) : Promise.resolve(null),
  ]);

  const maxFunnel = Math.max(1, ...Object.values(funnel.byStatus));
  const maxMonth = Math.max(1, ...revenue.byMonth.map((m) => m.cents));
  const maxReason = Math.max(1, ...reasons.map((r) => r.count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Relatórios</h1>
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
        <div className="grid grid-cols-3 gap-3">
          <Card label="Total vendido" value={brl(revenue.totalCents)} />
          <Card label="Vendas" value={String(revenue.count)} />
          <Card label="Ticket médio" value={brl(revenue.avgTicketCents)} />
        </div>
        {revenue.byMonth.length > 0 && (
          <div className="space-y-2 rounded-lg border bg-surface p-5 shadow-card">
            {revenue.byMonth.map((m) => (
              <div key={m.month} className="flex items-center gap-3 text-sm">
                <span className="w-14 shrink-0 text-muted">{monthLabel(m.month)}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-subtle">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(m.cents / maxMonth) * 100}%` }} />
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
                  className={`h-full rounded-full ${s === "approved" ? "bg-primary" : "bg-foreground/40"}`}
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
          <div className="grid grid-cols-3 gap-3">
            <Card label="Leads no período" value={String(leads.leads)} />
            <Card label="Viraram cliente" value={String(leads.converted)} />
            <Card label="Perdidos" value={String(leads.lost)} />
          </div>
          <div className="rounded-lg border bg-surface p-5 shadow-card">
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
                    <div className="h-full rounded-full bg-foreground/40" style={{ width: `${(r.count / maxReason) * 100}%` }} />
                  </div>
                  <span className="tabular w-6 text-right">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 4. RECEBÍVEIS */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Recebíveis</h2>
        <div className="grid grid-cols-3 gap-3">
          <Card label="A receber" value={brl(receivables.toReceiveCents)} />
          <Card label="Vencido" value={brl(receivables.overdueCents)} danger={receivables.overdueCents > 0} />
          <Card label="Recebido no período" value={brl(receivables.receivedCents)} />
        </div>
      </section>
    </div>
  );
}

function Card({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border bg-surface p-4 shadow-card">
      <p className="text-sm text-muted">{label}</p>
      <p className={`tabular mt-1 text-xl font-semibold ${danger ? "text-danger" : ""}`}>{value}</p>
    </div>
  );
}
