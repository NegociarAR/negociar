import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { getHourlyOverview } from "@/modules/orcamentos/hourly-overview-queries";
import { brl } from "@/lib/format";

const SITUATION_LABEL: Record<string, { label: string; cls: string }> = {
  pending_invoice: { label: "Mês(es) a faturar", cls: "border-danger/30 bg-danger/10 text-danger" },
  overdue: { label: "Fatura atrasada", cls: "border-danger/30 bg-danger/10 text-danger" },
  invoice_pending: { label: "Aguardando recebimento", cls: "border-warning/30 bg-warning/10 text-warning" },
  ok: { label: "Em dia", cls: "border-border text-muted" },
};

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[Number(m) - 1]}/${y}`;
}

function Card({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border bg-surface p-4 shadow-card">
      <p className="text-sm text-muted">{label}</p>
      <p className={`tabular mt-1 text-xl font-semibold ${danger ? "text-danger" : ""}`}>{value}</p>
    </div>
  );
}

// Painel consolidado: todo contrato por hora aprovado, com quem tem mês
// fechado sem fatura, fatura vencida, ou aguardando recebimento.
export default async function HourlyOverviewPage() {
  const { contracts, totals } = await getHourlyOverview();

  return (
    <div className="space-y-6">
      <BackLink href="/orcamentos" label="Voltar para orçamentos" />

      <div>
        <h1 className="text-xl font-semibold">Faturamento por hora</h1>
        <p className="text-sm text-muted">
          Todos os contratos por hora aprovados, e onde falta faturar ou receber.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card
          label="A faturar"
          value={brl(totals.pendingInvoiceCents)}
          danger={totals.pendingInvoiceCount > 0}
        />
        <Card label="Contratos com mês pendente" value={String(totals.pendingInvoiceCount)} danger={totals.pendingInvoiceCount > 0} />
        <Card label="Faturas vencidas" value={String(totals.overdueCount)} danger={totals.overdueCount > 0} />
      </div>

      {contracts.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-surface p-8 text-center text-sm text-muted">
          Nenhum contrato por hora ativo. Ative um em um orçamento aprovado.
        </p>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => {
            const sit = SITUATION_LABEL[c.situation];
            return (
              <Link
                key={c.quoteId}
                href={`/orcamentos/${c.quoteId}/horas`}
                className="block rounded-lg border bg-surface p-4 shadow-card transition hover:bg-subtle"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {c.customerName} <span className="text-muted">· #{c.quoteNumber}</span>
                    </p>
                    <p className="text-sm text-muted">
                      {brl(c.rateCents)}/hora
                      {c.currentMonthHours > 0 && ` · ${c.currentMonthHours.toFixed(2)}h lançadas este mês`}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${sit.cls}`}>{sit.label}</span>
                </div>

                {c.pendingMonths.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
                    {c.pendingMonths.map((m) => (
                      <li key={m.period} className="flex justify-between">
                        <span className="text-muted">{monthLabel(m.period)} — {m.hours.toFixed(2)}h</span>
                        <span className="tabular font-medium">{brl(m.estimatedCents)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {c.pendingMonths.length === 0 && c.lastInvoicePeriod && (
                  <p className="mt-3 border-t pt-3 text-sm text-muted">
                    Última fatura: {monthLabel(c.lastInvoicePeriod)} — {brl(c.lastInvoiceCents ?? 0)}
                    {c.lastInvoiceStatus === "received" && " · recebida"}
                    {c.lastInvoiceStatus === "pending" && " · aguardando recebimento"}
                    {c.lastInvoiceStatus === "overdue" && " · vencida"}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
