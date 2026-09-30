import { getSession, getEntitlements, hasModule } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { brl } from "@/lib/format";
import { currentPeriod, brtHour } from "@/lib/period";
import { receivableTotals } from "@/modules/recebiveis/queries";
import { attentionToday } from "@/modules/clientes/attention";
import { myBilling } from "@/modules/configuracoes/billing";
import { getHourlyOverview } from "@/modules/orcamentos/hourly-overview-queries";
import { fmtDay } from "@/lib/dates";
import Link from "next/link";

type Mods = { clientes: boolean; precifica: boolean; orcamentos: boolean };

// Só consulta o que o plano libera. Vendas = mês corrente (Brasília).
async function metrics(companyId: string, mods: Mods) {
  const supabase = await createClient();
  const monthStart = `${currentPeriod()}-01T00:00:00-03:00`;

  // conta + soma o valor potencial do estágio (lead/oportunidade), numa só query
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
  const salesValue = mods.orcamentos
    ? supabase.from("sales").select("total_cents")
        .eq("company_id", companyId).eq("status", "won").gte("sold_at", monthStart)
        .then((r) => r.data?.reduce((s, x) => s + (x.total_cents ?? 0), 0) ?? 0)
    : Promise.resolve(0);

  const [customerAgg, leadAgg, oppAgg, p, o, v] = await Promise.all([
    stageAgg("customer"),
    stageAgg("lead"),
    stageAgg("opportunity"),
    products,
    openQuotes,
    salesValue,
  ]);
  return {
    customers: customerAgg.count, leads: leadAgg.count, opportunities: oppAgg.count,
    leadsValueCents: leadAgg.valueCents, opportunitiesValueCents: oppAgg.valueCents,
    products: p, openQuotes: o, salesValue: v,
  };
}

function Card({ label, value, href, danger, sub }: { label: string; value: string; href?: string; danger?: boolean; sub?: string }) {
  const inner = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className={`tabular mt-1 text-2xl font-semibold ${danger ? "text-danger" : ""}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-xs ${danger ? "text-danger" : "text-muted"}`}>{sub}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="rounded-lg border bg-surface p-4 shadow-card transition hover:border-border-strong hover:bg-subtle">
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

  const [m, att, rec, billing, hourly] = await Promise.all([
    companyId
      ? metrics(companyId, mods)
      : Promise.resolve({ customers: 0, leads: 0, opportunities: 0, leadsValueCents: 0, opportunitiesValueCents: 0, products: 0, openQuotes: 0, salesValue: 0 }),
    companyId && mods.clientes
      ? attentionToday(companyId)
      : Promise.resolve({ items: [], total: 0, noAction: 0 }),
    mods.orcamentos
      ? receivableTotals()
      : Promise.resolve({ toReceive: 0, overdue: 0, receivedThisMonth: 0 }),
    companyId ? myBilling(companyId) : Promise.resolve(null),
    companyId && mods.orcamentos ? getHourlyOverview() : Promise.resolve(null),
  ]);

  const hour = brtHour();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">{greeting}</h1>
      </header>

      {/* mensalidade do NEGOCIAR em atraso */}
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

      {/* contratos por hora com mês fechado sem fatura */}
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {mods.clientes && (
          <Card label="Leads" value={String(m.leads)} href="/clientes?etapa=lead" sub={m.leadsValueCents > 0 ? brl(m.leadsValueCents) + " em potencial" : undefined} />
        )}
        {mods.clientes && (
          <Card label="Oportunidades" value={String(m.opportunities)} href="/clientes?etapa=opportunity" sub={m.opportunitiesValueCents > 0 ? brl(m.opportunitiesValueCents) + " em jogo" : undefined} />
        )}
        {mods.clientes && <Card label="Clientes" value={String(m.customers)} href="/clientes?etapa=customer" />}
        {mods.precifica && <Card label="Produtos" value={String(m.products)} href="/produtos" />}
        {mods.orcamentos && <Card label="Orçamentos abertos" value={String(m.openQuotes)} href="/orcamentos" />}
        {mods.orcamentos && <Card label="A receber" value={brl(rec.toReceive)} href="/recebiveis" />}
        {mods.orcamentos && <Card label="Vendas no mês" value={brl(m.salesValue)} href="/relatorios" />}
        {mods.orcamentos && hourly && hourly.contracts.length > 0 && (
          <Card
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
    </div>
  );
}
