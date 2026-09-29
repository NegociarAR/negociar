import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getQuote } from "@/modules/orcamentos/queries";
import { getSession } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { QuoteStatusBadge } from "@/modules/orcamentos/status-badge";
import { QuoteActions } from "@/modules/orcamentos/quote-actions";
import { CloseSaleForm } from "@/modules/vendas/close-sale-form";
import { CancelQuoteButton } from "@/modules/orcamentos/cancel-button";
import { HourlyToggle } from "@/modules/orcamentos/hourly-toggle";
import { monthsSince } from "@/lib/dates";
import { brl } from "@/lib/format";
import { HistoryPanel } from "@/modules/historico/history-panel";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function OrcamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();

  const session = await getSession();
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name, logo_url, cnpj, phone, city, state")
    .eq("id", session!.companyId!)
    .maybeSingle();
  const companyName = company?.name ?? "";

  // vendas deste orçamento — normal tem no máximo 1; contrato por hora pode ter várias (uma por mês)
  const { data: sales } = await supabase
    .from("sales")
    .select("id, net_cents, reference_period")
    .eq("quote_id", quote.id)
    .order("reference_period", { ascending: false });
  const existingSale = quote.is_hourly_contract ? null : (sales ?? [])[0] ?? null;
  const hourlySales = quote.is_hourly_contract ? (sales ?? []) : [];

  const canCancel = ["draft", "sent", "viewed", "negotiation", "negotiation_requested"].includes(quote.status);
  const suggestedRateCents = quote.items[0]?.unit_price_cents ?? null;
  const monthsSinceApproval = quote.decided_at ? monthsSince(quote.decided_at) : null;

  return (
    <div className="space-y-6">
      <Link
        href="/orcamentos"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft size={15} strokeWidth={1.8} />
        Voltar para orçamentos
      </Link>

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">
            Orçamento #{quote.number}
            {quote.version > 1 && (
              <span className="ml-1 text-muted">v{quote.version}</span>
            )}
          </h1>
          <QuoteStatusBadge status={quote.status} />
        </div>
        <div className="flex items-center gap-4">
          {!["approved", "rejected", "superseded"].includes(quote.status) && (
            <Link
              href={`/orcamentos/${id}/editar`}
              className="text-sm text-primary hover:underline"
            >
              Editar
            </Link>
          )}
          {canCancel && <CancelQuoteButton quoteId={id} />}
        </div>
      </header>

      {quote.decision_reason &&
        (quote.status === "rejected" ||
          quote.status === "negotiation_requested") && (
          <div
            className={`rounded-lg border border-l-2 bg-subtle p-4 text-sm ${
              quote.status === "negotiation_requested"
                ? "border-l-primary"
                : "border-l-danger"
            }`}
          >
            <p className="font-medium">
              {quote.status === "negotiation_requested"
                ? "Cliente quer negociar"
                : "Motivo da recusa"}
            </p>
            <p className="mt-1 text-muted">{quote.decision_reason}</p>
          </div>
        )}

      <div className="rounded-lg border bg-surface p-6">
        <p className="text-sm text-muted">Cliente</p>
        <p className="font-medium">{quote.customer_name ?? "—"}</p>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qtd</th>
              <th className="py-2 text-right font-medium">Unit.</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it) => (
              <tr key={it.id} className="border-b last:border-0">
                <td className="py-2">{it.description}</td>
                <td className="tabular py-2 text-right">{it.quantity}</td>
                <td className="tabular py-2 text-right">{brl(it.unit_price_cents)}</td>
                <td className="tabular py-2 text-right">{brl(it.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-8">
            <span className="text-muted">Subtotal</span>
            <span className="tabular w-28 text-right">{brl(quote.subtotal_cents)}</span>
          </div>
          {quote.discount_cents > 0 && (
            <div className="flex gap-8">
              <span className="text-muted">Desconto</span>
              <span className="tabular w-28 text-right">− {brl(quote.discount_cents)}</span>
            </div>
          )}
          <div className="flex gap-8 border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular w-28 text-right">{brl(quote.total_cents)}</span>
          </div>
        </div>
      </div>

      {(quote.valid_until || quote.payment_terms || quote.delivery_terms || quote.notes) && (
        <div className="space-y-2 rounded-lg border bg-surface p-6 text-sm">
          {quote.valid_until && <Row label="Validade" value={fmtDate(quote.valid_until)} />}
          {quote.payment_terms && <Row label="Pagamento" value={quote.payment_terms} />}
          {quote.delivery_terms && <Row label="Entrega" value={quote.delivery_terms} />}
          {quote.notes && <Row label="Observações" value={quote.notes} />}
        </div>
      )}

      <QuoteActions
        quoteId={quote.id}
        status={quote.status}
        publicToken={quote.public_token}
        whatsapp={quote.customer_whatsapp}
        pdfData={{
          number: quote.number,
          companyName: companyName,
          logoUrl: company?.logo_url ?? null,
          companyCnpj: company?.cnpj ?? null,
          companyPhone: company?.phone ?? null,
          companyCity: [company?.city, company?.state].filter(Boolean).join(", ") || null,
          customerName: quote.customer_name ?? "—",
          customerPhone: quote.customer_whatsapp ?? null,
          items: quote.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unit_price_cents: it.unit_price_cents,
            total_cents: it.total_cents,
          })),
          subtotal_cents: quote.subtotal_cents,
          discount_cents: quote.discount_cents,
          total_cents: quote.total_cents,
          valid_until: quote.valid_until,
          payment_terms: quote.payment_terms,
          delivery_terms: quote.delivery_terms,
          notes: quote.notes,
        }}
      />

      {/* Contrato por hora: ativa e mostra o resumo; venda normal: fluxo de sempre */}
      {quote.is_hourly_contract ? (
        quote.status === "approved" ? (
          <div className="space-y-3">
            <HourlyToggle
              quoteId={quote.id}
              active={quote.is_hourly_contract}
              rateCents={quote.hourly_rate_cents}
              monthsSinceApproval={monthsSinceApproval}
            />
            {hourlySales.length > 0 && (
              <div className="rounded-lg border bg-surface p-4 text-sm">
                <p className="mb-2 font-medium">
                  {hourlySales.length} fatura(s) gerada(s) · total {brl(hourlySales.reduce((s, x) => s + x.net_cents, 0))}
                </p>
                <ul className="space-y-1 text-muted">
                  {hourlySales.map((s) => (
                    <li key={s.id} className="tabular">
                      {s.reference_period} — {brl(s.net_cents)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted">
            O contrato por hora fica disponível para lançar horas após a aprovação do orçamento.
          </p>
        )
      ) : existingSale ? (
        <div className="rounded-lg border border-l-2 border-l-primary bg-primary-soft p-4 text-sm">
          <span className="font-medium">Venda registrada</span> ·{" "}
          <span className="tabular">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(existingSale.net_cents / 100)}
          </span>
        </div>
      ) : quote.status === "approved" ? (
        <div className="space-y-3">
          <CloseSaleForm
            quoteId={quote.id}
            companyId={session!.companyId!}
            grossCents={quote.total_cents}
          />
          <p className="text-center text-xs text-muted">— ou —</p>
          <HourlyToggle
            quoteId={quote.id}
            active={false}
            rateCents={null}
            suggestedRateCents={suggestedRateCents}
          />
        </div>
      ) : (
        <p className="text-xs text-muted">
          O fechamento de venda fica disponível após a aprovação do orçamento.
        </p>
      )}

      <HistoryPanel entityIds={[quote.id, ...(sales ?? []).map((s) => s.id)]} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
