import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { getQuote } from "@/modules/orcamentos/queries";
import { getHourlyContractData } from "@/modules/orcamentos/hourly-queries";
import { HourEntryForm } from "@/modules/orcamentos/hour-entry-form";
import { HoursWorkspace } from "@/modules/orcamentos/hours-workspace";
import { brl } from "@/lib/format";
import { monthsSince } from "@/lib/dates";

// Renomeie/salve como: src/app/(app)/orcamentos/[id]/horas/page.tsx (substitui o arquivo atual)
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
          Taxa: {brl(rateCents)}/hora. Lance as horas e selecione quais faturar, de qualquer período.
        </p>
      </div>

      {monthsSinceApproval !== null && monthsSinceApproval >= 3 && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Este orçamento foi aprovado há {monthsSinceApproval} meses ou mais. Vale reavaliar a taxa e as condições com o cliente antes de seguir faturando.
        </p>
      )}

      <HourEntryForm quoteId={id} />

      <HoursWorkspace
        quoteId={id}
        months={months}
        rateCents={rateCents}
        customerName={quote.customer_name ?? "Cliente"}
        customerWhatsapp={quote.customer_whatsapp}
        customerEmail={quote.customer_email}
      />
    </div>
  );
}
