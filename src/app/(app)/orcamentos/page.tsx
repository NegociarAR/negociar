import Link from "next/link";
import { listQuotes, countQuotesThisMonth } from "@/modules/orcamentos/queries";
import { QuoteRow } from "@/modules/orcamentos/quote-row";
import { getEntitlements, checkLimit, getSession } from "@/lib/entitlements";
import { Button } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageIcon } from "@/components/page-icon";
import { FileText } from "lucide-react";

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await getSession();
  const companyId = session?.companyId ?? "";
  const quotes = await listQuotes(q);
  const used = await countQuotesThisMonth();
  const ent = await getEntitlements();
  const gate = checkLimit(ent, "quotes_per_month", used);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
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
          <Link href="/orcamentos/horas" className="text-sm font-medium text-primary hover:underline">
            Faturamento por hora
          </Link>
          <Link href="/orcamentos/novo">
            <Button>+ Novo orçamento</Button>
          </Link>
        </div>
      </header>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por número ou cliente..."
          className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Button type="submit" variant="ghost">Buscar</Button>
      </form>

      {quotes.length === 0 ? (
        <EmptyState message={q ? "Nenhum orçamento encontrado." : "Nenhum orçamento ainda."} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((qt) => (
                <QuoteRow key={qt.id} qt={qt} companyId={companyId} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
