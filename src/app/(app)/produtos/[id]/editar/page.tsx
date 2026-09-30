import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";
import { getProduct, getPriceHistory } from "@/modules/produtos/queries";
import { updateProduct } from "@/modules/produtos/actions";
import { ProductForm } from "@/modules/produtos/product-form";
import { brl } from "@/lib/format";
import { ProductStatusSelect } from "@/modules/produtos/product-status-select";
import { HistoryPanel } from "@/modules/historico/history-panel";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default async function EditarProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const product = await getProduct(id);
  if (!product) notFound();
  const history = await getPriceHistory(id);

  const action = updateProduct.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/produtos" label="Voltar para produtos" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="min-w-0 break-words text-xl font-semibold">{product.name}</h1>
        <ProductStatusSelect
          productId={id}
          active={(product as { is_active?: boolean }).is_active !== false}
        />
      </div>
      <ProductForm action={action} initial={product} submitLabel="Salvar alterações" erro={erro} />

      <HistoryPanel entityIds={[id]} />

      {history.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-surface p-5">
          <h2 className="text-sm font-semibold">Histórico de preços</h2>
          <ul className="divide-y text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between py-2">
                <span className="tabular text-muted">{fmtDate(h.created_at)}</span>
                <span className="tabular">
                  {h.suggested_price_cents != null ? brl(h.suggested_price_cents) : "—"}
                  {h.is_reverse ? " (reversa)" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
