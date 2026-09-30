import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/modules/admin/queries";
import { StatusBadge } from "@/modules/admin/status-badge";
import { AdminActions } from "@/modules/admin/admin-actions";
import { ExemptToggle } from "@/modules/admin/exempt-toggle";
import { BackLink } from "@/components/back-link";
import { createClient } from "@/lib/supabase/server";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function AdminCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCompanyDetail(id);
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
        <h1 className="min-w-0 break-words text-xl font-semibold">{company.name}</h1>
        <StatusBadge status={company.status} />
      </header>

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
