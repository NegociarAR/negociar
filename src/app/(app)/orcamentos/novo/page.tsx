import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { quoteFormOptions, countQuotesThisMonth } from "@/modules/orcamentos/queries";
import { QuoteBuilder } from "@/modules/orcamentos/quote-builder";
import { getEntitlements, checkLimit } from "@/lib/entitlements";

export default async function NovoOrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; preco?: string }>;
}) {
  const { item, preco } = await searchParams;
  const { customers, products } = await quoteFormOptions();
  const used = await countQuotesThisMonth();
  const ent = await getEntitlements();
  const gate = checkLimit(ent, "quotes_per_month", used);

  const prefillItem =
    item && preco ? { description: item, unitPrice: preco } : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <BackLink href="/orcamentos" label="Voltar para orçamentos" />
      <h1 className="text-xl font-semibold">Novo orçamento</h1>

      {!gate.allowed ? (
        <div className="rounded-lg border border-l-2 border-l-primary bg-primary-soft p-6 text-center text-sm">
          <p>Você atingiu o limite de {gate.limit} orçamentos por mês do seu plano.</p>
          <Link href="/configuracoes" className="mt-2 inline-block font-medium text-foreground underline">
            Fazer upgrade
          </Link>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-surface p-8 text-center text-sm text-muted">
          Cadastre um cliente antes de criar um orçamento.{" "}
          <Link href="/clientes/novo" className="text-foreground underline">Novo cliente</Link>
        </div>
      ) : (
        <QuoteBuilder customers={customers} products={products} prefillItem={prefillItem} />
      )}
    </div>
  );
}
