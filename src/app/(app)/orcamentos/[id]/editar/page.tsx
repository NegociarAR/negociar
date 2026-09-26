import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { notFound, redirect } from "next/navigation";
import { getQuote, quoteFormOptions } from "@/modules/orcamentos/queries";
import { QuoteBuilder, type QuoteInitial } from "@/modules/orcamentos/quote-builder";
import { brl } from "@/lib/format";

export default async function EditarOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();

  // aprovado/recusado/substituído não editam
  if (["approved", "rejected", "superseded"].includes(quote.status)) {
    redirect(`/orcamentos/${id}`);
  }

  const { customers, products } = await quoteFormOptions();
  const isRevision = quote.status !== "draft";

  const initial: QuoteInitial = {
    quoteId: quote.id,
    customerId: quote.customer_id,
    discount: quote.discount_cents
      ? (quote.discount_cents / 100).toFixed(2).replace(".", ",")
      : "",
    validUntil: quote.valid_until ?? "",
    payment: quote.payment_terms ?? "",
    delivery: quote.delivery_terms ?? "",
    notes: quote.notes ?? "",
    isRevision,
    items: quote.items.map((it) => ({
      product_id: it.product_id,
      description: it.description,
      quantity: String(it.quantity),
      unitPrice: (it.unit_price_cents / 100).toFixed(2).replace(".", ","),
    })),
  };

  return (
    <div className="space-y-5">
      <BackLink href={`/orcamentos/${id}`} label={`Voltar para #${quote.number}`} />
      <h1 className="text-xl font-semibold">Editar orçamento #{quote.number}</h1>

      {isRevision && (
        <div className="rounded-lg border border-l-2 border-l-primary bg-primary-soft p-3 text-sm">
          Este orçamento já foi enviado. Ao salvar, será criada a{" "}
          <strong>versão {quote.version + 1}</strong> (#{quote.number}-v
          {quote.version + 1}) e a versão atual será arquivada. Você poderá
          reenviar a nova versão ao cliente.
        </div>
      )}

      <QuoteBuilder customers={customers} products={products} initial={initial} />
    </div>
  );
}
