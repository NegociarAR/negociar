import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { quoteFormOptions, countQuotesThisMonth } from "@/modules/orcamentos/queries";
import { QuoteBuilder, type PrefillTemplate } from "@/modules/orcamentos/quote-builder";
import { getEntitlements, checkLimit } from "@/lib/entitlements";
import { listTemplates, getTemplate } from "@/modules/orcamentos/template-actions";
import { TemplatePicker } from "@/modules/orcamentos/template-picker";
import { parseBRLToCents } from "@/lib/format";

function centsToBRL(cents: number): string {
  if (!cents) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export default async function NovoOrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; preco?: string; cliente?: string; template?: string }>;
}) {
  const { item, preco, cliente, template: templateId } = await searchParams;
  const [{ customers, products }, used, ent, templates] = await Promise.all([
    quoteFormOptions(),
    countQuotesThisMonth(),
    getEntitlements(),
    listTemplates(),
  ]);
  const gate = checkLimit(ent, "quotes_per_month", used);

  const prefillItem =
    item && preco ? { description: item, unitPrice: preco } : undefined;

  let prefillTemplate: PrefillTemplate | undefined;
  if (templateId && !prefillItem) {
    const tpl = await getTemplate(templateId);
    if (tpl) {
      prefillTemplate = {
        discount: centsToBRL(tpl.discount_cents),
        payment: tpl.payment_terms ?? "",
        delivery: tpl.delivery_terms ?? "",
        notes: tpl.notes ?? "",
        items: tpl.items.map((i) => ({
          product_id: i.product_id,
          description: i.description,
          quantity: String(i.quantity),
          unitPrice: centsToBRL(i.unit_price_cents),
        })),
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <BackLink href="/orcamentos" label="Voltar para orçamentos" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Novo orçamento</h1>
        {templates.length > 0 && (
          <Link href="/orcamentos/templates" className="text-xs text-muted underline hover:text-foreground">
            Gerenciar templates
          </Link>
        )}
      </div>

      {templates.length > 0 && (
        <TemplatePicker templates={templates} currentTemplateId={templateId} />
      )}

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
        <QuoteBuilder
          customers={customers}
          products={products}
          prefillItem={prefillItem}
          prefillCustomerId={cliente}
          prefillTemplate={prefillTemplate}
        />
      )}
    </div>
  );
}
