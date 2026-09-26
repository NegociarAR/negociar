import Link from "next/link";
import { listProducts, countProducts } from "@/modules/produtos/queries";
import { getEntitlements, checkLimit } from "@/lib/entitlements";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/form";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; limite?: string }>;
}) {
  const { q, limite } = await searchParams;
  const { products } = await listProducts(q);
  const used = await countProducts();
  const ent = await getEntitlements();
  const gate = checkLimit(ent, "products", used);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted">
            {gate.limit === null ? `${used} produtos` : `${used}/${gate.limit} produtos`}
          </p>
        </div>
        <Link href="/produtos/novo">
          <Button>+ Novo produto</Button>
        </Link>
      </header>

      {limite && (
        <div className="flex items-center justify-between rounded-lg border border-l-2 border-l-foreground bg-subtle px-4 py-3 text-sm">
          <span>Você atingiu o limite de {gate.limit} produtos do seu plano.</span>
          <Link href="/configuracoes" className="font-medium text-foreground underline">
            Fazer upgrade
          </Link>
        </div>
      )}

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome ou SKU..."
          className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Button type="submit" variant="ghost">Buscar</Button>
      </form>

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-surface p-10 text-center text-sm text-muted">
          {q ? "Nenhum produto encontrado." : "Nenhum produto ainda."}
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-surface">
          {products.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted">
                  {p.sku ? `${p.sku} · ` : ""}Custo {brl(p.cost_cents)}
                  {p.current_price_cents != null && ` · Preço ${brl(p.current_price_cents)}`}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link href={`/precificar?produto=${p.id}`} className="text-primary hover:underline">
                  Precificar
                </Link>
                <Link href={`/produtos/${p.id}/editar`} className="text-muted hover:text-foreground">
                  Editar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
