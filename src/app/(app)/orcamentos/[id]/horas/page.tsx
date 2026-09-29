import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { getQuote } from "@/modules/orcamentos/queries";
import { getHourlyContractData } from "@/modules/orcamentos/hourly-queries";
import { HourEntryForm } from "@/modules/orcamentos/hour-entry-form";
import { MonthGroupCard } from "@/modules/orcamentos/month-group";
import { brl } from "@/lib/format";
import { monthsSince } from "@/lib/dates";

export default async function HorasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();
  if (!quote.is_hourly_contract) redirect(`/orcamentos/${id}`);

  const { months } = await getHourlyContractData(id);
  const rateCents = quote.hourly_rate_cents ?? 0;
  const monthsSinceApproval = quote.decided_at ? monthsSince(quote.decided_at) : null;

  return (
    <div className="space-y-6">
      <BackLink href={`/orcamentos/${id}`} label={`Voltar para #${quote.number}`} />

      <div>
        <h1 className="text-xl font-semibold">Horas — {quote.customer_name ?? "Cliente"}</h1>
        <p className="text-sm text-muted">
          Taxa: {brl(rateCents)}/hora. Lance as horas trabalhadas e gere a fatura no fim de cada mês.
        </p>
      </div>

      {monthsSinceApproval !== null && monthsSinceApproval >= 3 && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Este orçamento foi aprovado há {monthsSinceApproval} meses ou mais. Vale reavaliar a taxa e as condições com o cliente antes de seguir faturando.
        </p>
      )}

      <HourEntryForm quoteId={id} />

      {months.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-surface p-8 text-center text-sm text-muted">
          Nenhuma hora lançada ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {months.map((g) => (
            <MonthGroupCard key={g.period} quoteId={id} group={g} rateCents={rateCents} />
          ))}
        </div>
      )}
    </div>
  );
}
