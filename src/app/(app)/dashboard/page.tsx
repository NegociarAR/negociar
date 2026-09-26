import { getSession } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { brl } from "@/lib/format";
import { followupCounts } from "@/modules/followups/queries";
import { receivableTotals } from "@/modules/recebiveis/queries";
import Link from "next/link";

async function metrics(companyId: string) {
  const supabase = await createClient();

  const [customers, quotes, negotiation, sales] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .is("deleted_at", null),
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .in("status", ["sent", "viewed", "negotiation"]),
    supabase
      .from("quotes")
      .select("total_cents")
      .eq("company_id", companyId)
      .in("status", ["sent", "viewed", "negotiation"]),
    supabase
      .from("sales")
      .select("total_cents")
      .eq("company_id", companyId)
      .eq("status", "won"),
  ]);

  const negValue =
    negotiation.data?.reduce((s, r) => s + (r.total_cents ?? 0), 0) ?? 0;
  const salesValue =
    sales.data?.reduce((s, r) => s + (r.total_cents ?? 0), 0) ?? 0;

  return {
    customers: customers.count ?? 0,
    openQuotes: quotes.count ?? 0,
    negValue,
    salesValue,
  };
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
  const m = session?.companyId
    ? await metrics(session.companyId)
    : { customers: 0, openQuotes: 0, negValue: 0, salesValue: 0 };
  const fu = await followupCounts();
  const rec = await receivableTotals();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">{greeting}</h1>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Clientes" value={String(m.customers)} href="/clientes" />
        <Card label="Orçamentos abertos" value={String(m.openQuotes)} href="/orcamentos" />
        <Card label="A receber" value={brl(rec.toReceive)} href="/recebiveis" />
        <Card label="Vendas" value={brl(m.salesValue)} href="/relatorios" />
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
