import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { listHistory } from "@/modules/historico/queries";
import { HistoryList } from "@/modules/historico/history-list";

const TABS: { key: string; label: string; types?: string[] }[] = [
  { key: "todos", label: "Todos" },
  { key: "clientes", label: "Clientes", types: ["customers"] },
  { key: "orcamentos", label: "Orçamentos", types: ["quotes"] },
  { key: "vendas", label: "Vendas", types: ["sales"] },
  { key: "produtos", label: "Produtos", types: ["products", "product_categories"] },
  { key: "followups", label: "Follow-ups", types: ["followups"] },
  { key: "empresa", label: "Empresa e plano", types: ["companies", "subscriptions", "plan_requests", "billing_invoices"] },
];
const PAGE = 50;

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; pagina?: string }>;
}) {
  const { tipo, pagina } = await searchParams;
  const tab = TABS.find((t) => t.key === tipo) ?? TABS[0];
  const page = Math.max(1, Number(pagina) || 1);
  const { rows, hasMore } = await listHistory({
    entityTypes: tab.types,
    limit: PAGE,
    offset: (page - 1) * PAGE,
  });

  const href = (t: string, p = 1) => `/historico?tipo=${t}${p > 1 ? `&pagina=${p}` : ""}`;

  return (
    <div className="space-y-5">
      <BackLink href="/configuracoes" label="Voltar para configurações" />
      <div>
        <h1 className="text-xl font-semibold">Histórico de alterações</h1>
        <p className="text-sm text-muted">Quem alterou o quê e quando. Os registros não podem ser editados nem apagados.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b text-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 ${
              tab.key === t.key ? "border-primary font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border bg-surface shadow-card">
        <HistoryList rows={rows} />
      </div>

      <div className="flex justify-between text-sm">
        {page > 1 ? <Link href={href(tab.key, page - 1)} className="text-muted hover:text-foreground">← Mais recentes</Link> : <span />}
        {hasMore && <Link href={href(tab.key, page + 1)} className="text-muted hover:text-foreground">Mais antigos →</Link>}
      </div>
    </div>
  );
}
