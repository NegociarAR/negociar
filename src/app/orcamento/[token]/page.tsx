import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { brl } from "@/lib/format";
import { PublicDecision } from "./decision";
import { MarkViewed } from "./mark-viewed";

interface QuoteItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_public_quote", { p_token: token });
  if (error || !data) notFound();

  const quote = data.quote as {
    number: number;
    total_cents: number;
    subtotal_cents: number;
    discount_cents: number;
    valid_until: string | null;
    payment_terms: string | null;
    delivery_terms: string | null;
    notes: string | null;
    status: string;
  };
  const company = data.company as {
    name: string; logo_url: string | null; cnpj?: string | null;
    phone?: string | null; email?: string | null; city?: string | null; state?: string | null;
  };
  const customer = data.customer as {
    name: string; cnpj?: string | null; phone?: string | null;
    city?: string | null; state?: string | null; contact?: string | null;
  };
  const items = (data.items as QuoteItem[]) ?? [];

  const validade = fmtDate(quote.valid_until);
  const decidable = quote.status === "sent" || quote.status === "viewed";

  return (
    <div className="min-h-dvh bg-background py-4 sm:py-8">
      <MarkViewed token={token} />
      <div className="mx-auto max-w-2xl px-3 sm:px-4">
        <div className="overflow-hidden rounded-2xl border bg-surface shadow-card">

          {/* cabeçalho */}
          <div className="flex items-start justify-between gap-4 border-b bg-subtle px-5 py-5 sm:px-8 sm:py-7">
            <div className="min-w-0">
              <p className="text-sm text-muted">Proposta comercial</p>
              <h1 className="mt-0.5 text-2xl font-semibold">Orçamento #{quote.number}</h1>
            </div>
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo_url} alt={company.name} className="max-h-12 max-w-[40%] shrink-0 object-contain sm:max-h-14 sm:max-w-[160px]" />
            ) : null}
          </div>

          {/* De / Para */}
          <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="min-w-0 break-words px-5 py-4 sm:px-8 sm:py-5">
              <p className="text-xs uppercase tracking-wide text-muted">De</p>
              <p className="mt-2 font-medium">{company.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {company.cnpj && <>CNPJ {company.cnpj}<br /></>}
                {company.phone && <>{company.phone}<br /></>}
                {[company.city, company.state].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="min-w-0 break-words px-5 py-4 sm:px-8 sm:py-5">
              <p className="text-xs uppercase tracking-wide text-muted">Para</p>
              <p className="mt-2 font-medium">{customer.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {customer.contact && <>Contato: {customer.contact}<br /></>}
                {customer.cnpj && <>CNPJ {customer.cnpj}<br /></>}
                {customer.phone && <>{customer.phone}<br /></>}
                {[customer.city, customer.state].filter(Boolean).join(", ")}
              </p>
            </div>
          </div>

          {/* itens */}
          <div className="px-5 py-5 sm:px-8 sm:py-6">
            <p className="mb-3 text-xs uppercase tracking-wide text-muted">Itens da proposta</p>
            <div className="overflow-hidden rounded-xl border">
              {items.map((it, i) => (
                <div
                  key={i}
                  className={`flex items-start justify-between gap-3 px-4 py-3 ${i < items.length - 1 ? "border-b" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">{it.description}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {it.quantity} × {brl(it.unit_price_cents)}
                    </p>
                  </div>
                  <p className="tabular shrink-0 whitespace-nowrap text-sm">{brl(it.total_cents)}</p>
                </div>
              ))}
            </div>

            {/* totais */}
            <div className="ml-auto mt-4 w-full sm:w-64">
              <div className="flex justify-between py-1 text-sm text-muted">
                <span>Subtotal</span><span className="tabular">{brl(quote.subtotal_cents)}</span>
              </div>
              {quote.discount_cents > 0 && (
                <div className="flex justify-between py-1 text-sm text-muted">
                  <span>Desconto</span><span className="tabular">− {brl(quote.discount_cents)}</span>
                </div>
              )}
              <div className="mt-1.5 flex items-center justify-between border-t border-border-strong pt-2.5">
                <span className="font-medium">Total</span>
                <span className="tabular text-lg font-semibold">{brl(quote.total_cents)}</span>
              </div>
            </div>
          </div>

          {/* condições */}
          {(validade || quote.payment_terms || quote.delivery_terms) && (
            <div className="px-5 pb-5 sm:px-8 sm:pb-6">
              <div className="grid grid-cols-1 gap-3 break-words rounded-xl bg-subtle p-4 sm:grid-cols-3 sm:gap-4">
                {validade && (
                  <div>
                    <p className="text-xs text-muted">Validade</p>
                    <p className="mt-0.5 text-sm">{validade}</p>
                  </div>
                )}
                {quote.payment_terms && (
                  <div>
                    <p className="text-xs text-muted">Pagamento</p>
                    <p className="mt-0.5 text-sm">{quote.payment_terms}</p>
                  </div>
                )}
                {quote.delivery_terms && (
                  <div>
                    <p className="text-xs text-muted">Entrega</p>
                    <p className="mt-0.5 text-sm">{quote.delivery_terms}</p>
                  </div>
                )}
              </div>
              {quote.notes && (
                <p className="mt-3 whitespace-pre-line break-words text-sm text-muted">{quote.notes}</p>
              )}
            </div>
          )}

          {/* decisão */}
          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            {decidable ? (
              <PublicDecision token={token} />
            ) : quote.status === "approved" ? (
              <div className="rounded-xl border border-l-2 border-l-primary bg-primary-soft p-4 text-center text-sm">
                Proposta aprovada. Obrigado!
              </div>
            ) : quote.status === "rejected" ? (
              <div className="rounded-xl border p-4 text-center text-sm text-muted">Proposta recusada.</div>
            ) : quote.status === "negotiation_requested" ? (
              <div className="rounded-xl border border-l-2 border-l-primary bg-primary-soft p-4 text-center text-sm">
                Pedido de negociação enviado. Em breve você receberá uma proposta revisada.
              </div>
            ) : quote.status === "superseded" ? (
              <div className="rounded-xl border p-4 text-center text-sm text-muted">
                Esta versão foi revisada. Solicite o link atualizado.
              </div>
            ) : quote.status === "canceled" ? (
              <div className="rounded-xl border p-4 text-center text-sm text-muted">
                Este orçamento foi cancelado. Entre em contato caso tenha dúvidas.
              </div>
            ) : null}
          </div>

          {/* rodapé com a marca */}
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
