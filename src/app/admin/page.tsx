import Link from "next/link";
import { listCompanies, companyCounts, pendingPlanRequests } from "@/modules/admin/queries";
import { PlanRequestActions } from "@/modules/admin/plan-request-actions";
import { AdminCompanyRow } from "@/modules/admin/admin-company-row";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [companies, counts, requests] = await Promise.all([
    listCompanies(status),
    companyCounts(),
    pendingPlanRequests(),
  ]);

  const tabs = [
    { key: "", label: "Todas" },
    { key: "pending", label: `Pendentes (${counts.pending})` },
    { key: "active", label: `Ativas (${counts.active})` },
    { key: "suspended", label: `Suspensas (${counts.suspended})` },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Empresas</h1>

      {requests.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">
            Solicitações de plano{" "}
            <span className="text-muted">({requests.length})</span>
          </h2>
          <div className="divide-y rounded-lg border border-l-2 border-l-primary bg-surface">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="text-sm">
                  <span className="font-medium">{r.companyName}</span>
                  <span className="text-muted">
                    {" "}· {r.currentPlan ?? "—"} → <strong className="text-foreground">{r.requestedPlan}</strong>
                  </span>
                  {r.note && <p className="text-xs text-muted">{r.note}</p>}
                </div>
                <PlanRequestActions requestId={r.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => {
          const active = (status ?? "") === t.key;
          return (
            <Link
              key={t.key}
              href={t.key ? `/admin?status=${t.key}` : "/admin"}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {companies.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-surface p-10 text-center text-sm text-muted">
          Nenhuma empresa neste filtro.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted">
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium">Cadastro</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <AdminCompanyRow key={c.id} c={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
