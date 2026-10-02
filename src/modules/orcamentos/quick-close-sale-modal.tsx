"use client";

import { X } from "lucide-react";
import { CloseSaleForm } from "@/modules/vendas/close-sale-form";

// Fecha a venda de um orçamento aprovado sem sair da lista — reaproveita
// o mesmo CloseSaleForm do detalhe do orçamento, só muda onde ele aparece.
export function QuickCloseSaleModal({
  quoteId,
  quoteNumber,
  companyId,
  grossCents,
  onClose,
}: {
  quoteId: string;
  quoteNumber: number;
  companyId: string;
  grossCents: number;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border bg-surface p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Fechar venda — orçamento #{quoteNumber}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <CloseSaleForm quoteId={quoteId} companyId={companyId} grossCents={grossCents} />
      </div>
    </div>
  );
}
