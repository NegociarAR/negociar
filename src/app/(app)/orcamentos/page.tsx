import Link from "next/link";
import { listQuotes, countQuotesThisMonth } from "@/modules/orcamentos/queries";
import { QuoteRow } from "@/modules/orcamentos/quote-row";
import { getEntitlements, checkLimit } from "@/lib/entitlements";
import { Button } from "@/components/ui/form";

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const quotes = await listQuotes(q);
  const used = await countQuotesThisMonth();
  const ent = await getEntitlements();
  const gate = checkLimit(ent, "quotes_per_month", used);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Orçamentos</h1>
          <p className="text-sm text-muted">
            {gate.limit === null ? `${used} este mês` : `${used}/${gate.limit} este mês`}
          </p>
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
        <div className="rounded-lg border border-dashed bg-surface p-10 text-center text-sm text-muted">
          {q ? "Nenhum orçamento encontrado." : "Nenhum orçamento ainda."}
        </div>
      ) : (
        <div className="rounded-lg border bg-surface">
          <table className="w-full text-sm">
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
                <QuoteRow key={qt.id} qt={qt} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
