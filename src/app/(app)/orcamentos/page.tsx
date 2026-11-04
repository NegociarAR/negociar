import Link from "next/link";
import { listQuotes, countQuotesThisMonth, countQuotesByGroup, getPendingFollowupQuoteIds } from "@/modules/orcamentos/queries";
import type { QuoteStatusGroup } from "@/modules/orcamentos/queries";
import { QuoteRow } from "@/modules/orcamentos/quote-row";
import { getEntitlements, checkLimit, getSession } from "@/lib/entitlements";
import { Button } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageIcon } from "@/components/page-icon";
import { FileText } from "lucide-react";

const TABS: { key: QuoteStatusGroup; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "abertos", label: "Em aberto" },
  { key: "aprovados", label: "Aprovados" },
  { key: "recusados", label: "Recusados" },
  { key: "rascunhos", label: "Rascunhos" },
];

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const group: QuoteStatusGroup =
    (status as QuoteStatusGroup | undefined) &&
    ["todos", "abertos", "aprovados", "recusados", "rascunhos"].includes(status!)
      ? (status as QuoteStatusGroup)
      : "todos";

  const session = await getSession();
  const companyId = session?.companyId ?? "";
  const [quotes, used, ent, groupCounts, pendingFollowupIds] = await Promise.all([
    listQuotes(q, group),
    countQuotesThisMonth(),
    getEntitlements(),
    countQuotesByGroup(),
    getPendingFollowupQuoteIds(),
  ]);
  const gate = checkLimit(ent, "quotes_per_month", used);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <PageIcon module="orcamentos" icon={FileText} />
          <div>
            <h1 className="text-xl font-semibold">Orçamentos</h1>
            <p className="text-sm text-muted">
              {gate.limit === null ? `${used} este mês` : `${used}/${gate.limit} este mês`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/orcamentos/horas" className="hidden text-sm font-medium text-primary hover:underline sm:inline">
            Faturamento por hora
          </Link>
          <Link href="/orcamentos/novo">
            <Button>+ Novo</Button>
          </Link>
        </div>
      </header>

      {/* tabs de status */}
      <div className="relative">
        <div className="overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-1 px-0.5">
            {TABS.map((tab) => {
              const active = tab.key === group;
              const count = groupCounts[tab.key];
              const href = `?${new URLSearchParams({ ...(q ? { q } : {}), ...(tab.key !== "todos" ? { status: tab.key } : {}) }).toString()}`;
              return (
                <Link
                  key={tab.key}
                  href={href}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-2 pt-1 text-sm transition ${
                    active
                      ? "border-primary font-medium text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 text-[11px] tabular ${active ? "bg-primary text-primary-fg" : "bg-subtle text-muted"}`}>
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <form className="flex gap-2">
        {group !== "todos" && <input type="hidden" name="status" value={group} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por número ou cliente..."
          className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Button type="submit" variant="ghost">Buscar</Button>
      </form>

      {quotes.length === 0 ? (
        <EmptyState
          message={q ? "Nenhum orçamento encontrado." : "Nenhum orçamento ainda."}
          action={!q && group === "todos" ? { label: "Criar orçamento", href: "/orcamentos/novo" } : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-surface">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Validade</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((qt) => (
                <QuoteRow
                  key={qt.id}
                  qt={qt}
                  companyId={companyId}
                  hasFollowup={pendingFollowupIds.has(qt.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
