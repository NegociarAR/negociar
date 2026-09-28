import Link from "next/link";
import { listProducts, countProducts } from "@/modules/produtos/queries";
import { getEntitlements, checkLimit } from "@/lib/entitlements";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/form";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; limite?: string; status?: string }>;
}) {
  const { q, limite, status } = await searchParams;
  const { products: all } = await listProducts(q);
  const isActive = (p: unknown) => (p as { is_active?: boolean }).is_active !== false;
  const filter = status === "active" || status === "inactive" ? status : "all";
  const counts = { all: all.length, active: all.filter(isActive).length, inactive: all.filter((p) => !isActive(p)).length };
  const products = filter === "all" ? all : all.filter((p) => (filter === "active") === isActive(p));
  const tabHref = (k: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (k !== "all") sp.set("status", k);
    const qs = sp.toString();
    return `/produtos${qs ? `?${qs}` : ""}`;
  };
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
        <div className="flex items-center justify-between rounded-lg border border-l-2 border-l-primary bg-primary-soft px-4 py-3 text-sm">
          <span>Você atingiu o limite de {gate.limit} produtos do seu plano.</span>
          <Link href="/configuracoes" className="font-medium text-foreground underline">
            Fazer upgrade
          </Link>
        </div>
      )}

      <div className="flex gap-1 border-b text-sm">
        {([["all", "Todos"], ["active", "Ativos"], ["inactive", "Inativos"]] as const).map(([k, label]) => (
          <Link
            key={k}
            href={tabHref(k)}
            className={`-mb-px border-b-2 px-3 py-2 ${
              filter === k ? "border-primary font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {label} <span className="tabular text-xs text-muted">{counts[k]}</span>
          </Link>
        ))}
      </div>

      <form className="flex gap-2">
        {filter !== "all" && <input type="hidden" name="status" value={filter} />}
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
          {q || filter !== "all" ? "Nenhum produto encontrado." : "Nenhum produto ainda."}
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-surface">
          {products.map((p) => (
            <li key={p.id} className={`flex items-center justify-between px-4 py-3 ${isActive(p) ? "" : "opacity-55"}`}>
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {p.name}
                  {!isActive(p) && <span className="rounded-full border px-2 py-0.5 text-xs font-normal text-muted">Inativo</span>}
                </p>
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
