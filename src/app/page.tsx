import Link from "next/link";
import { listCompanies, companyCounts } from "@/modules/admin/queries";
import { StatusBadge } from "@/modules/admin/status-badge";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [companies, counts] = await Promise.all([
    listCompanies(status),
    companyCounts(),
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
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/empresas/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.plan_name ?? "—"}
                  </td>
                  <td className="tabular px-4 py-3 text-muted">
                    {fmtDate(c.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
