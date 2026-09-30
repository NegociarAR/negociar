import { getSession, getEntitlements, hasModule } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { brl } from "@/lib/format";
import { currentPeriod, brtHour } from "@/lib/period";
import { receivableTotals } from "@/modules/recebiveis/queries";
import { attentionToday } from "@/modules/clientes/attention";
import { myBilling } from "@/modules/configuracoes/billing";
import { fmtDay } from "@/lib/dates";
import Link from "next/link";

type Mods = { clientes: boolean; precifica: boolean; orcamentos: boolean };

// Só consulta o que o plano libera. Vendas = mês corrente (Brasília).
async function metrics(companyId: string, mods: Mods) {
  const supabase = await createClient();
  const monthStart = `${currentPeriod()}-01T00:00:00-03:00`;

  const countStage = (stage: string) =>
    mods.clientes
      ? supabase.from("customers").select("id", { count: "exact", head: true })
          .eq("company_id", companyId).is("deleted_at", null).eq("stage", stage)
          .then((r) => r.count ?? 0)
      : Promise.resolve(0);

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

  const [customers, leads, opportunities, p, o, v] = await Promise.all([
    countStage("customer"),
    countStage("lead"),
    countStage("opportunity"),
    products,
    openQuotes,
    salesValue,
  ]);
  return { customers, leads, opportunities, products: p, openQuotes: o, salesValue: v };
}

function Card({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className="tabular mt-1 break-words text-xl font-semibold sm:text-2xl">{value}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="min-w-0 rounded-lg border bg-surface p-3 shadow-card transition hover:border-border-strong hover:bg-subtle sm:p-4">
        {inner}
      </Link>
    );
  }
  return <div className="min-w-0 rounded-lg border bg-surface p-3 shadow-card sm:p-4">{inner}</div>;
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

  const [m, att, rec, billing] = await Promise.all([
    companyId
      ? metrics(companyId, mods)
      : Promise.resolve({ customers: 0, leads: 0, opportunities: 0, products: 0, openQuotes: 0, salesValue: 0 }),
    companyId && mods.clientes
      ? attentionToday(companyId)
      : Promise.resolve({ items: [], total: 0, noAction: 0 }),
    mods.orcamentos
      ? receivableTotals()
      : Promise.resolve({ toReceive: 0, overdue: 0, receivedThisMonth: 0 }),
    companyId ? myBilling(companyId) : Promise.resolve(null),
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
          <Link href="/configuracoes" className="inline-block py-2 text-xs font-medium underline">Ver faturas</Link>
        </div>
      )}

      {/* atenção hoje: quem eu preciso acompanhar */}
      {(att.items.length > 0 || att.noAction > 0) && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Atenção hoje {att.total > 0 && <span className="text-muted">({att.total})</span>}
            </h2>
            <Link href="/follow-ups" className="-my-2 py-2.5 text-sm text-muted hover:text-foreground">Ver todos →</Link>
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
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-subtle"
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
        {mods.clientes && <Card label="Leads" value={String(m.leads)} href="/clientes?etapa=lead" />}
        {mods.clientes && <Card label="Oportunidades" value={String(m.opportunities)} href="/clientes?etapa=opportunity" />}
        {mods.clientes && <Card label="Clientes" value={String(m.customers)} href="/clientes?etapa=customer" />}
        {mods.precifica && <Card label="Produtos" value={String(m.products)} href="/produtos" />}
        {mods.orcamentos && <Card label="Orçamentos abertos" value={String(m.openQuotes)} href="/orcamentos" />}
        {mods.orcamentos && <Card label="A receber" value={brl(rec.toReceive)} href="/recebiveis" />}
        {mods.orcamentos && <Card label="Vendas no mês" value={brl(m.salesValue)} href="/relatorios" />}
      </div>

      {rec.overdue > 0 && (
        <Link
          href="/recebiveis"
          className="flex items-center justify-between gap-3 rounded-lg border border-l-2 border-l-danger bg-surface px-4 py-3 text-sm shadow-card transition hover:bg-subtle"
        >
          <span>
            <strong className="font-semibold text-danger">{brl(rec.overdue)}</strong> em parcelas vencidas
          </span>
          <span className="shrink-0 text-muted">Ver →</span>
        </Link>
      )}
    </div>
  );
}
