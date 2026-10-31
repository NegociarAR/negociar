import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { listTemplates, getTemplate } from "@/modules/orcamentos/template-actions";
import { DeleteTemplateButton } from "@/modules/orcamentos/delete-template-button";
import { EmptyState } from "@/components/ui/empty-state";
import { brl } from "@/lib/format";

export default async function TemplatesPage() {
  const summaries = await listTemplates();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <BackLink href="/orcamentos/novo" label="Voltar para novo orçamento" />
      <h1 className="text-xl font-semibold">Templates de orçamento</h1>

      {summaries.length === 0 ? (
        <EmptyState message='Nenhum template ainda. Ao criar um orçamento, use "Salvar itens como template".' />
      ) : (
        <ul className="divide-y rounded-lg border bg-surface">
          {summaries.map((s) => (
            <TemplateRow key={s.id} id={s.id} name={s.name} />
          ))}
        </ul>
      )}
    </div>
  );
}

async function TemplateRow({ id, name }: { id: string; name: string }) {
  const tpl = await getTemplate(id);
  if (!tpl) return null;

  const subtotal = tpl.items.reduce(
    (acc, it) => acc + it.quantity * it.unit_price_cents,
    0,
  );
  const total = Math.max(0, subtotal - tpl.discount_cents);

  return (
    <li className="space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted">
            {tpl.items.length} {tpl.items.length === 1 ? "item" : "itens"} ·{" "}
            <span className="tabular">{brl(total)}</span>
            {tpl.payment_terms && ` · ${tpl.payment_terms}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`/orcamentos/novo?template=${id}`}
            className="text-sm text-primary underline hover:opacity-80"
          >
            Usar
          </Link>
          <DeleteTemplateButton id={id} />
        </div>
      </div>
    </li>
  );
}
