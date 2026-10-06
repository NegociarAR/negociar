import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { brl } from "@/lib/format";
import { HourSummaryDecision } from "./decision";

// Salve como: src/app/horas-resumo/[token]/page.tsx
interface Entry {
  entry_date: string;
  hours: number;
  description: string | null;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function PublicHourSummaryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_public_hour_summary", { p_token: token });
  if (error || !data) notFound();

  const summary = data.summary as {
    hours: number;
    rate_cents: number;
    total_cents: number;
    status: string;
    response_note: string | null;
  };
  const company = data.company as { name: string; logo_url: string | null };
  const customer = data.customer as { name: string };
  const quote = data.quote as { number: number };
  const entries = (data.entries as Entry[]) ?? [];

  return (
    <div className="min-h-dvh bg-background py-4 sm:py-8">
      <div className="mx-auto max-w-2xl px-3 sm:px-4">
        <div className="overflow-hidden rounded-2xl border bg-surface shadow-card">
          <div className="flex items-start justify-between gap-4 border-b bg-subtle px-5 py-5 sm:px-8 sm:py-7">
            <div className="min-w-0">
              <p className="text-sm text-muted">Resumo de horas</p>
              <h1 className="mt-0.5 text-2xl font-semibold">Orçamento #{quote.number}</h1>
            </div>
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt={company.name}
                className="max-h-12 max-w-[40%] shrink-0 object-contain sm:max-h-14 sm:max-w-[160px]"
              />
            ) : null}
          </div>

          <div className="px-5 py-4 sm:px-8 sm:py-5">
            <p className="text-xs uppercase tracking-wide text-muted">Para</p>
            <p className="mt-2 font-medium">{customer.name}</p>
          </div>

          <div className="px-5 py-5 sm:px-8 sm:py-6">
            <p className="mb-3 text-xs uppercase tracking-wide text-muted">Horas lançadas</p>
            <div className="overflow-hidden rounded-xl border">
              {entries.map((e, i) => (
                <div
                  key={i}
                  className={`flex items-start justify-between gap-3 px-4 py-3 ${i < entries.length - 1 ? "border-b" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{fmtDate(e.entry_date)}</p>
                    {e.description && <p className="mt-0.5 break-words text-xs text-muted">{e.description}</p>}
                  </div>
                  <p className="tabular shrink-0 whitespace-nowrap text-sm">{Number(e.hours).toFixed(2)}h</p>
                </div>
              ))}
            </div>

            <div className="ml-auto mt-4 w-full sm:w-64">
              <div className="flex justify-between py-1 text-sm text-muted">
                <span>Total de horas</span>
                <span className="tabular">{summary.hours.toFixed(2)}h</span>
              </div>
              <div className="flex justify-between py-1 text-sm text-muted">
                <span>Valor/hora</span>
                <span className="tabular">{brl(summary.rate_cents)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between border-t border-border-strong pt-2.5">
                <span className="font-medium">Total estimado</span>
                <span className="tabular text-lg font-semibold">{brl(summary.total_cents)}</span>
              </div>
            </div>
          </div>

          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            {summary.status === "pending" ? (
              <HourSummaryDecision token={token} />
            ) : summary.status === "approved" ? (
              <div className="rounded-xl border border-l-2 border-l-primary bg-primary-soft p-4 text-center text-sm">
                Horas validadas. Obrigado!
              </div>
            ) : (
              <div className="rounded-xl border p-4 text-center text-sm text-muted">
                Contestado{summary.response_note ? `: ${summary.response_note}` : "."}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 border-t bg-subtle py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/n.png" alt="" className="h-4 w-4 object-contain" />
            <span className="text-xs text-muted">
              Feito com{" "}
              <span className="font-semibold">
                NEGOCI<span style={{ color: "#5E6AD2" }}>AR</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
