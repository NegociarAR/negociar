import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/modules/admin/queries";
import { StatusBadge } from "@/modules/admin/status-badge";
import { AdminActions } from "@/modules/admin/admin-actions";
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
      <div className="text-sm text-muted">
        <Link href="/admin" className="hover:text-foreground">
          Empresas
        </Link>{" "}
        / {company.name}
      </div>

      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{company.name}</h1>
        <StatusBadge status={company.status} />
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border bg-surface p-5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted">{label}</span>
              <span className="tabular">{value ?? "—"}</span>
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
