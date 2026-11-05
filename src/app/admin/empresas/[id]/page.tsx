import { notFound } from "next/navigation";
import { getCompanyDetail, getCompanyUsage, getQuotesPerMonth } from "@/modules/admin/queries";
import { StatusBadge } from "@/modules/admin/status-badge";
import { AdminActions } from "@/modules/admin/admin-actions";
import { ExemptToggle } from "@/modules/admin/exempt-toggle";
import { AsaasToggle } from "@/modules/admin/asaas-toggle";
import { BackLink } from "@/components/back-link";
import { createClient } from "@/lib/supabase/server";
import { PageIcon } from "@/components/page-icon";
import { Building2 } from "lucide-react";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Sparkline({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 120, H = 32, barW = Math.floor(W / data.length) - 2;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      {data.map((d, i) => {
        const h = Math.max(2, Math.round((d.count / max) * H));
        const x = i * (barW + 2);
        const isLast = i === data.length - 1;
        return (
          <rect
            key={d.month}
            x={x} y={H - h} width={barW} height={h}
            rx={1}
            fill={isLast ? "var(--color-primary, #6366f1)" : "currentColor"}
            opacity={isLast ? 1 : 0.3}
          />
        );
      })}
    </svg>
  );
}

function StatCard({
  label,
  used,
  limit,
  sparkData,
}: {
  label: string;
  used: number;
  limit: number | null;
  sparkData?: { month: string; count: number }[];
}) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : null;
  const danger = pct !== null && pct >= 90;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-surface p-4">
      <div className="min-w-0 space-y-1">
        <p className="text-xs text-muted">{label}</p>
        <p className={`text-lg font-semibold tabular-nums ${danger ? "text-danger" : ""}`}>
          {used}
          {limit !== null && (
            <span className="text-sm font-normal text-muted"> / {limit}</span>
          )}
        </p>
        {pct !== null && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-subtle">
            <div
              className={`h-full rounded-full transition-all ${danger ? "bg-danger" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
      {sparkData && <Sparkline data={sparkData} />}
    </div>
  );
}

export default async function AdminCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, usage, sparkData] = await Promise.all([
    getCompanyDetail(id),
    getCompanyUsage(id),
    getQuotesPerMonth(id, 6),
  ]);
  if (!detail) notFound();
  const { company, sub } = detail;

  // catálogo de planos para o seletor
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order");

  const rows: [string, string | null][] = [
    ["Razão social", company.legal_name],
    ["CNPJ", company.cnpj],
    ["E-mail", company.email],
    ["Telefone", company.phone],
    ["Cidade", company.city],
    ["Cadastro", fmtDate(company.created_at)],
    ["Vencimento", fmtDate(sub?.current_period_end)],
  ];

  return (
    <div className="space-y-6">
      <BackLink href="/admin" label="Voltar para empresas" />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PageIcon module="admin" icon={Building2} />
          <h1 className="min-w-0 break-words text-xl font-semibold">{company.name}</h1>
        </div>
        <StatusBadge status={company.status} />
      </header>

      {usage && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Uso</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Clientes" used={usage.customers} limit={usage.limits.customers} />
            <StatCard label="Produtos" used={usage.products} limit={usage.limits.products} />
            <StatCard
              label="Orçamentos este mês"
              used={usage.quotesThisMonth}
              limit={usage.limits.quotes_per_month}
              sparkData={sparkData}
            />
          </div>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border bg-surface p-5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-sm">
              <span className="shrink-0 text-muted">{label}</span>
              <span className="tabular min-w-0 break-words text-right">{value ?? "—"}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-3 text-sm">
            <span className="text-muted">Plano atual</span>
            <span className="font-medium">
              {(sub as { plans?: { name?: string } })?.plans?.name ?? "—"}
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold">Ações</h2>
          <div className="mb-4 border-b pb-4">
  <ExemptToggle
    companyId={company.id}
    exempt={Boolean((company as { billing_exempt?: boolean }).billing_exempt)}
  />
</div>
<div className="mb-4 border-b pb-4">
  <AsaasToggle
    companyId={company.id}
    enabled={(company as { billing_method?: string }).billing_method === "asaas"}
  />
</div>
          <AdminActions
            companyId={company.id}
            status={company.status}
            planId={sub?.plan_id ?? null}
            periodEnd={sub?.current_period_end ?? null}
            plans={plans ?? []}
          />
        </div>
      </div>
    </div>
  );
}
