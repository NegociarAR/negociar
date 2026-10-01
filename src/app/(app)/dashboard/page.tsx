import { getSession, getEntitlements, hasModule } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { brl } from "@/lib/format";
import { currentPeriod, brtHour } from "@/lib/period";
import { receivableTotals } from "@/modules/recebiveis/queries";
import { attentionToday } from "@/modules/clientes/attention";
import { myBilling } from "@/modules/configuracoes/billing";
import { getHourlyOverview } from "@/modules/orcamentos/hourly-overview-queries";
import { getMonthlyGoalsProgress } from "@/modules/configuracoes/goals-queries";
import { GoalCard } from "@/modules/configuracoes/goal-card";
import { getSalesTrend, getRevenueVariance, getTopCustomers, monthLabel } from "@/modules/relatorios/dashboard-insights";
import { Sparkline } from "@/components/sparkline";
import { fmtDay } from "@/lib/dates";
import Link from "next/link";
import { LogoN } from "@/components/logo";
import {
  Users,
  TrendingUp,
  UserCheck,
  Package,
  FileText,
  Wallet,
  Clock,
  type LucideIcon,
} from "lucide-react";

type Mods = { clientes: boolean; precifica: boolean; orcamentos: boolean };

// Cada métrica pertence a um módulo da marca — o chip do card usa a cor dele
// (azul = ClienteZap, verde = Precifica, roxo = OrçaFácil).
type Mod = "clientes" | "precifica" | "orcamentos";
const MODULE_STYLE: Record<Mod, { text: string; bg: string }> = {
  clientes: { text: "text-module-clientes", bg: "bg-module-clientes/10" },
  precifica: { text: "text-module-precifica", bg: "bg-module-precifica/10" },
  orcamentos: { text: "text-module-orcamentos", bg: "bg-module-orcamentos/10" },
};

// Só consulta o que o plano libera. Não inclui vendas/faturamento — isso
// vem de getRevenueVariance, que já calcula o mês atual e o anterior juntos
// (evita duplicar a mesma query em dois lugares).
async function metrics(companyId: string, mods: Mods) {
  const supabase = await createClient();

  const stageAgg = (stage: string) =>
    mods.clientes
      ? supabase.from("customers").select("estimated_value_cents")
          .eq("company_id", companyId).is("deleted_at", null).eq("stage", stage)
          .then((r) => {
            const rows = r.data ?? [];
            return { count: rows.length, valueCents: rows.reduce((s, x) => s + (x.estimated_value_cents ?? 0), 0) };
          })
      : Promise.resolve({ count: 0, valueCents: 0 });

  const products = mods.precifica
    ? supabase.from("products").select("id", { count: "exact", head: true })
        .eq("company_id", companyId).is("deleted_at", null).eq("is_active", true).then((r) => r.count ?? 0)
    : Promise.resolve(0);
  const openQuotes = mods.orcamentos
    ? supabase.from("quotes").select("id", { count: "exact", head: true })
        .eq("company_id", companyId).is("deleted_at", null)
        .in("status", ["sent", "viewed", "negotiation", "negotiation_requested"]).then((r) => r.count ?? 0)
    : Promise.resolve(0);

  const [customerAgg, leadAgg, oppAgg, p, o] = await Promise.all([
    stageAgg("customer"), stageAgg("lead"), stageAgg("opportunity"), products, openQuotes,
  ]);
  return {
    customers: customerAgg.count, leads: leadAgg.count, opportunities: oppAgg.count,
    leadsValueCents: leadAgg.valueCents, opportunitiesValueCents: oppAgg.valueCents,
    products: p, openQuotes: o,
  };
}

function Card({
  label, value, href, danger, sub, module, icon: Icon,
}: {
  label: string; value: string; href?: string; danger?: boolean; sub?: string;
  module: Mod; icon: LucideIcon;
}) {
  const style = MODULE_STYLE[module];
  const inner = (
    <>
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${danger ? "bg-danger/10 text-danger" : `${style.bg} ${style.text}`}`}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <p className="text-sm text-muted">{label}</p>
      <p className={`tabular mt-0.5 text-xl font-semibold ${danger ? "text-danger" : ""}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-xs font-medium ${danger ? "text-danger" : style.text}`}>{sub}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={`rounded-lg border bg-surface p-4 shadow-card transition hover:border-border-strong hover:bg-subtle ${danger ? "border-danger/30" : ""}`}>
        {inner}
      </Link>
    );
  }
  return <div className="rounded-lg border bg-surface p-4 shadow-card">{inner}</div>;
}

function fmtShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default async function DashboardPage() {
  const session = await getSession();
  const ent = await getEntitlements();
  const mods: Mods = {
    clientes: hasModule(ent, "clientes"),
    precifica: hasModule(ent, "precifica"),
    orcamentos: hasModule(ent, "orcamentos"),
  };
  const companyId = session?.companyId ?? null;

  const [m, att, rec, billing, hourly, goals, trend, revenue, topCustomers] = await Promise.all([
    companyId
      ? metrics(companyId, mods)
      : Promise.resolve({ customers: 0, leads: 0, opportunities: 0, leadsValueCents: 0, opportunitiesValueCents: 0, products: 0, openQuotes: 0 }),
    companyId && mods.clientes ? attentionToday(companyId) : Promise.resolve({ items: [], total: 0, noAction: 0 }),
    mods.orcamentos ? receivableTotals() : Promise.resolve({ toReceive: 0, overdue: 0, receivedThisMonth: 0 }),
    companyId ? myBilling(companyId) : Promise.resolve(null),
    companyId && mods.orcamentos ? getHourlyOverview() : Promise.resolve(null),
    companyId ? getMonthlyGoalsProgress(companyId) : Promise.resolve([]),
    companyId && mods.orcamentos ? getSalesTrend(companyId) : Promise.resolve([]),
    companyId && mods.orcamentos ? getRevenueVariance(companyId) : Promise.resolve({ currentCents: 0, variancePct: null }),
    companyId && mods.orcamentos ? getTopCustomers(companyId) : Promise.resolve([]),
  ]);

  const hour = brtHour();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  // qualquer pendência de dinheiro (vencido, mensalidade, fatura de hora) sobe pro topo
  const hasMoneyAlert = rec.overdue > 0 || billing?.alert || (hourly && hourly.totals.pendingInvoiceCount > 0);

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-lg p-6 text-white shadow-brand"
        style={{ background: "linear-gradient(100deg, #2e7cf6 0%, #1fae5e 50%, #7c3aed 100%)" }}
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute bottom-[-70px] right-20 h-36 w-36 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <LogoN size={28} />
          <h1 className="text-2xl font-semibold">{greeting}</h1>
        </div>
      </div>

      {/* dinheiro parado vem antes de tudo */}
      {hasMoneyAlert && (
        <div className="space-y-2">
          {rec.overdue > 0 && (
            <Link
              href="/recebiveis"
              className="flex items-center justify-between rounded-lg border border-l-2 border-l-danger bg-surface px-4 py-3 text-sm shadow-card transition hover:bg-subtle"
            >
              <span>
                <strong className="font-semibold text-danger">{brl(rec.overdue)}</strong> em parcelas vencidas
              </span>
              <span className="text-muted">Ver →</span>
            </Link>
          )}

          {billing?.alert && (
            <div className="space-y-1 rounded-lg border border-l-2 border-l-danger bg-surface px-4 py-3 text-sm shadow-card">
              <p>
                <strong className="text-danger">Mensalidade em atraso:</strong>{" "}
                {billing.alert.count} título(s), {brl(billing.alert.cents)}.{" "}
                {billing.alert.pastGrace
                  ? "O prazo de tolerância terminou e o acesso pode ser suspenso a qualquer momento."
                  : `Regularize até ${fmtDay(billing.alert.regularizeUntil)} para evitar a suspensão do acesso.`}
              </p>
              {billing.instructions && <p className="whitespace-pre-line text-xs text-muted">{billing.instructions}</p>}
              <Link href="/configuracoes" className="text-xs font-medium underline">Ver faturas</Link>
            </div>
          )}

          {hourly && hourly.totals.pendingInvoiceCount > 0 && (
            <Link
              href="/orcamentos/horas"
              className="flex items-center justify-between rounded-lg border border-l-2 border-l-danger bg-surface px-4 py-3 text-sm shadow-card transition hover:bg-subtle"
            >
              <span>
                <strong className="text-danger">{hourly.totals.pendingInvoiceCount} contrato(s) por hora</strong>{" "}
                com mês fechado sem fatura — {brl(hourly.totals.pendingInvoiceCents)} a faturar.
              </span>
              <span className="text-muted">Ver →</span>
            </Link>
          )}
        </div>
      )}

      {goals.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {goals.map((g) => (
            <GoalCard key={g.metric} goal={g} />
          ))}
        </div>
      )}

      {/* atenção hoje: quem eu preciso acompanhar */}
      {(att.items.length > 0 || att.noAction > 0) && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Atenção hoje {att.total > 0 && <span className="text-muted">({att.total})</span>}
            </h2>
            <Link href="/follow-ups" className="text-sm text-muted hover:text-foreground">Ver todos →</Link>
          </div>
          <ul className="divide-y rounded-lg border border-l-2 border-l-primary bg-surface shadow-card">
            {att.items.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/clientes/${i.customerId}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-subtle"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{i.name}</span>
                    {i.reason && <span className="text-muted"> · {i.reason}</span>}
                  </span>
                  <span className={`tabular shrink-0 text-xs ${i.overdue ? "text-danger" : "text-muted"}`}>
                    {i.overdue ? `atrasado desde ${fmtShort(i.dueDate)}` : "hoje"}
                  </span>
                </Link>
              </li>
            ))}
            {att.noAction > 0 && (
              <li>
                <Link
                  href="/clientes?etapa=lead"
                  className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-subtle"
                >
                  <span>
                    {att.noAction} {att.noAction === 1 ? "lead/oportunidade" : "leads/oportunidades"} sem próxima ação
                  </span>
                  <span className="text-muted">Definir →</span>
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}

      {/* vendas em destaque: valor + variação + tendência dos últimos 6 meses */}
      {mods.orcamentos && (
        <Link
          href="/relatorios"
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-surface p-5 shadow-card transition hover:border-border-strong hover:bg-subtle"
        >
          <div>
            <p className="text-sm text-muted">Vendas no mês</p>
            <p className="tabular mt-1 text-3xl font-semibold">{brl(revenue.currentCents)}</p>
            {revenue.variancePct !== null && (
              <p className={`mt-1 text-sm ${revenue.variancePct >= 0 ? "text-success" : "text-danger"}`}>
                {revenue.variancePct >= 0 ? "+" : ""}
                {revenue.variancePct.toFixed(0)}% vs mês anterior
              </p>
            )}
          </div>
          {trend.some((t) => t.cents > 0) && (
            <div className="text-right">
              <Sparkline points={trend.map((t) => t.cents)} />
              <p className="mt-1 text-xs text-muted">
                {monthLabel(trend[0].month)} — {monthLabel(trend[trend.length - 1].month)}
              </p>
            </div>
          )}
        </Link>
      )}

      {/* métricas secundárias */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {mods.clientes && (
          <Card module="clientes" icon={Users} label="Leads" value={String(m.leads)} href="/clientes?etapa=lead" sub={m.leadsValueCents > 0 ? brl(m.leadsValueCents) + " em potencial" : undefined} />
        )}
        {mods.clientes && (
          <Card module="clientes" icon={TrendingUp} label="Oportunidades" value={String(m.opportunities)} href="/clientes?etapa=opportunity" sub={m.opportunitiesValueCents > 0 ? brl(m.opportunitiesValueCents) + " em jogo" : undefined} />
        )}
        {mods.clientes && <Card module="clientes" icon={UserCheck} label="Clientes" value={String(m.customers)} href="/clientes?etapa=customer" />}
        {mods.precifica && <Card module="precifica" icon={Package} label="Produtos" value={String(m.products)} href="/produtos" />}
        {mods.orcamentos && <Card module="orcamentos" icon={FileText} label="Orçamentos abertos" value={String(m.openQuotes)} href="/orcamentos" />}
        {mods.orcamentos && <Card module="orcamentos" icon={Wallet} label="A receber" value={brl(rec.toReceive)} href="/recebiveis" />}
        {mods.orcamentos && hourly && hourly.contracts.length > 0 && (
          <Card
            module="orcamentos"
            icon={Clock}
            label="Faturamento por hora"
            value={brl(hourly.totals.pendingInvoiceCents)}
            href="/orcamentos/horas"
            danger={hourly.totals.pendingInvoiceCount > 0}
            sub={
              hourly.totals.pendingInvoiceCount > 0
                ? `a faturar · ${hourly.totals.pendingInvoiceCount} contrato(s)`
                : "tudo faturado"
            }
          />
        )}
      </div>

      {/* top 3 clientes dos últimos 90 dias — onde o dinheiro está vindo */}
      {topCustomers.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Seus melhores clientes <span className="font-normal text-muted">(90 dias)</span></h2>
          <ul className="divide-y rounded-lg border bg-surface shadow-card">
            {topCustomers.map((c, i) => (
              <li key={c.id}>
                <Link href={`/clientes/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-subtle">
                  <span className="flex items-center gap-2 min-w-0 truncate">
                    <span className="tabular text-xs text-muted">#{i + 1}</span>
                    <span className="font-medium">{c.name}</span>
                  </span>
                  <span className="tabular shrink-0 font-medium">{brl(c.totalCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
