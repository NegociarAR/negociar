import Link from "next/link";
import { listServiceInvoices } from "@/modules/financeiro/invoice-queries";
import { InvoiceStatusBadge, RefreshStatusButton } from "@/modules/financeiro/invoice-row-actions";
import { brl } from "@/lib/format";
import { fmtDay } from "@/lib/dates";

export default async function NotasFiscaisPage() {
  const invoices = await listServiceInvoices();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold">Notas fiscais</h1>
        <p className="text-sm text-muted">
          Emitidas automaticamente ao fechar uma venda, se habilitado em{" "}
          <Link href="/configuracoes" className="text-primary underline">Configurações</Link>.
        </p>
      </header>

      {invoices.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-surface p-8 text-center text-sm text-muted">
          Nenhuma nota fiscal ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Número</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{inv.customerName}</td>
                  <td className="tabular px-4 py-3 text-muted">{fmtDay(inv.createdAt.slice(0, 10))}</td>
                  <td className="tabular px-4 py-3">{brl(inv.amountCents)}</td>
                  <td className="tabular px-4 py-3">{inv.nfseNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                    {inv.errorMessage && <p className="mt-0.5 max-w-60 truncate text-xs text-danger" title={inv.errorMessage}>{inv.errorMessage}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.status === "issued" && inv.pdfUrl ? (
                      <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary underline">
                        Ver PDF
                      </a>
                    ) : inv.status === "processing" || inv.status === "pending" || inv.status === "error" ? (
                      <RefreshStatusButton invoiceId={inv.id} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
