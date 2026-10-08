import { parseBRLToCents } from "@/lib/format";

export function parseQty(v: string): number {
  const n = parseFloat((v || "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

export interface QuoteCalcItem {
  quantity: string;
  unitPrice: string;
}

// Mesma conta usada no builder (subtotal, desconto, total) e espelhada
// pela RPC create_quote no banco — mantém os dois lados em sincronia.
export function quoteSubtotalCents(items: QuoteCalcItem[]): number {
  return items.reduce((s, i) => s + Math.round(parseQty(i.quantity) * parseBRLToCents(i.unitPrice)), 0);
}

export function quoteTotalCents(items: QuoteCalcItem[], discount: string): number {
  const subtotal = quoteSubtotalCents(items);
  const discountCents = parseBRLToCents(discount);
  return Math.max(0, subtotal - discountCents);
}
