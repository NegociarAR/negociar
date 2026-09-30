import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { getPaymentsReport, listPaymentMonths, METHOD_LABELS } from "@/modules/admin/payments-queries";
import { ExportCsvButton } from "@/modules/admin/export-csv-button";
import { MonthSelect } from "@/modules/admin/month-select";
import { brl } from "@/lib/format";
import { currentPeriod } from "@/lib/period";

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-surface p-3 shadow-card sm:p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="tabular mt-1 break-words text-lg font-semibold sm:text-xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export default async function RecebimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const month = mes && (mes === "all" || /^\d{4}-\d{2}$/.test(mes)) ? mes : currentPeriod();

  const [report, months] = await Promise.all([getPaymentsReport(month), listPaymentMonths()]);
  if (report.setupNeeded) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Recebimentos</h1>
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted">
          Estrutura financeira não encontrada. Rode as migrations do financeiro no Supabase.
        </p>
      </div>
    );
  }

  // garante que o mês atual e os meses com pagamento apareçam no seletor, sem duplicar
  const options = Array.from(new Set([currentPeriod(), ...months])).sort().reverse();

  return (
    <div className="space-y-6">
      <BackLink href="/admin/financeiro" label="Voltar para financeiro" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Recebimentos</h1>
          <p className="text-sm text-muted">
            Histórico de títulos recebidos, por forma de pagamento — para conferência com o extrato bancário.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelect options={options} value={month} currentMonth={currentPeriod()} />
          <ExportCsvButton rows={report.rows} month={month} />
        </div>
      </div>

      {/* total + por forma de pagamento */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card label="Total recebido" value={brl(report.totalCents)} sub={`${report.totalCount} título(s)`} />
        {report.byMethod.map((m) => (
          <Card key={m.method} label={m.label} value={brl(m.cents)} sub={`${m.count} título(s)`} />
        ))}
      </div>

      {/* extrato detalhado */}
      {report.rows.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-surface p-6 text-center text-sm text-muted">
          Nenhum recebimento neste período.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Referência</th>
                <th className="px-4 py-3 font-medium">Forma</th>
                <th className="px-4 py-3 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="tabular px-4 py-3">
                    {new Date(r.paid_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/empresas/${r.company_id}`} className="hover:underline">
                      {r.company_name}
                    </Link>
                    {r.description && <p className="text-xs text-muted">{r.description}</p>}
                  </td>
                  <td className="tabular px-4 py-3 text-muted">{r.reference_period}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border px-2 py-0.5 text-xs">
                      {METHOD_LABELS[r.payment_method ?? "outro"] ?? r.payment_method ?? "—"}
                    </span>
                  </td>
                  <td className="tabular px-4 py-3 font-medium">{brl(r.paid_amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
