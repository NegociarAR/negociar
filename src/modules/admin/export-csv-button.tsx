"use client";

import { METHOD_LABELS, type PaymentRow } from "./payments-types";

function csvEscape(v: string): string {
  if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

// Exporta a lista visível como CSV (separador ;, compatível com Excel pt-BR)
// para conferência com o extrato bancário fora do sistema.
export function ExportCsvButton({ rows, month }: { rows: PaymentRow[]; month: string }) {
  function download() {
    const header = ["Data do pagamento", "Empresa", "Referência", "Descrição", "Forma de pagamento", "Valor (R$)"];
    const lines = rows.map((r) => [
      new Date(r.paid_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      r.company_name,
      r.reference_period,
      r.description ?? "",
      METHOD_LABELS[r.payment_method ?? "outro"] ?? r.payment_method ?? "—",
      (r.paid_amount_cents / 100).toFixed(2).replace(".", ","),
    ]);
    const csv = [header, ...lines].map((row) => row.map(csvEscape).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recebimentos_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      disabled={rows.length === 0}
      className="h-10 md:h-9 rounded-lg border px-4 text-sm font-medium transition hover:bg-subtle disabled:opacity-50"
    >
      Exportar CSV
    </button>
  );
}
