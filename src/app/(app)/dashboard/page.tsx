import { getSession, getEntitlements, hasModule } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { brl } from "@/lib/format";
import { currentPeriod, brtHour } from "@/lib/period";
import { followupCounts } from "@/modules/followups/queries";
import { receivableTotals } from "@/modules/recebiveis/queries";
import Link from "next/link";

type Mods = { clientes: boolean; precifica: boolean; orcamentos: boolean };

// Só consulta o que o plano libera. Vendas = mês corrente (Brasília).
async function metrics(companyId: string, mods: Mods) {
  const supabase = await createClient();
  const monthStart = `${currentPeriod()}-01T00:00:00-03:00`;

  const customers = mods.clientes
    ? supabase.from("customers").select("id", { count: "exact", head: true })
        .eq("company_id", companyId).is("deleted_at", null).then((r) => r.count ?? 0)
    : Promise.resolve(0);
  const products = mods.precifica
    ? supabase.from("products").select("id", { count: "exact", head: true })
        .eq("company_id", companyId).is("deleted_at", null).then((r) => r.count ?? 0)
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

  const [c, p, o, v] = await Promise.all([customers, products, openQuotes, salesValue]);
  return { customers: c, products: p, openQuotes: o, salesValue: v };
}

function Card({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold">{value}</p>
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

export default async function DashboardPage() {
  const session = await getSession();
  const ent = await getEntitlements();
  const mods: Mods = {
    clientes: hasModule(ent, "clientes"),
    precifica: hasModule(ent, "precifica"),
    orcamentos: hasModule(ent, "orcamentos"),
  };

  const [m, fu, rec] = await Promise.all([
    session?.companyId
      ? metrics(session.companyId, mods)
      : Promise.resolve({ customers: 0, products: 0, openQuotes: 0, salesValue: 0 }),
    mods.clientes ? followupCounts() : Promise.resolve({ overdue: 0, today: 0 }),
    mods.orcamentos
      ? receivableTotals()
      : Promise.resolve({ toReceive: 0, overdue: 0, receivedThisMonth: 0 }),
  ]);

  const hour = brtHour();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">{greeting}</h1>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {mods.clientes && <Card label="Clientes" value={String(m.customers)} href="/clientes" />}
        {mods.precifica && <Card label="Produtos" value={String(m.products)} href="/produtos" />}
        {mods.orcamentos && <Card label="Orçamentos abertos" value={String(m.openQuotes)} href="/orcamentos" />}
        {mods.orcamentos && <Card label="A receber" value={brl(rec.toReceive)} href="/recebiveis" />}
        {mods.orcamentos && <Card label="Vendas no mês" value={brl(m.salesValue)} href="/relatorios" />}
      </div>

      {(fu.overdue > 0 || fu.today > 0) && (
        <Link
          href="/follow-ups"
          className="flex items-center justify-between rounded-lg border border-l-2 border-l-primary bg-primary-soft px-4 py-3 text-sm transition hover:bg-subtle"
        >
          <span>
            {(() => {
              const parts: string[] = [];
              if (fu.overdue > 0) {
                parts.push(
                  `${fu.overdue} follow-up${fu.overdue > 1 ? "s" : ""} atrasado${fu.overdue > 1 ? "s" : ""}`,
                );
              }
              if (fu.today > 0) {
                // se já houver "atrasados", "para hoje" basta; senão, nomeia
                parts.push(
                  parts.length > 0
                    ? `${fu.today} para hoje`
                    : `${fu.today} follow-up${fu.today > 1 ? "s" : ""} para hoje`,
                );
              }
              return parts.join(" · ");
            })()}
          </span>
          <span className="text-muted">Ver →</span>
        </Link>
      )}

      {rec.overdue > 0 && (
        <Link
          href="/recebiveis"
          className="flex items-center justify-between rounded-lg border border-l-2 border-l-danger bg-surface px-4 py-3 text-sm shadow-card transition hover:bg-subtle"
        >
          <span>
            <strong className="font-semibold text-danger">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(rec.overdue / 100)}
            </strong>{" "}
            em parcelas vencidas
          </span>
          <span className="text-muted">Ver →</span>
        </Link>
      )}
    </div>
  );
}
