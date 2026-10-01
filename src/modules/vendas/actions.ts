"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { computeSale, type SaleInput } from "./sale-calc";

export interface CloseSaleInput extends SaleInput {
  quoteId: string;
  paymentMethod: string;
  docType: string;
  signatureKind: "aceite" | "upload";
  signedDocUrl?: string | null;
  notes?: string | null;
}

// Fecha a venda de um orçamento aprovado. O CÁLCULO (desconto, parcelas)
// é feito em TS (sale-calc.ts, testado unitariamente); a PERSISTÊNCIA
// (venda + parcelas + aprovação do orçamento + timeline) é uma única
// transação no banco (close_sale) — item 8 da auditoria.
export async function closeSale(input: CloseSaleInput) {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const supabase = await createClient();

  // busca o total real do orçamento no banco (item 4: nunca confia no
  // valor vindo do client) para recalcular a venda no server
  const { data: quote } = await supabase
    .from("quotes")
    .select("total_cents")
    .eq("id", input.quoteId)
    .eq("company_id", session.companyId)
    .maybeSingle();
  if (!quote) return { ok: false, error: "Orçamento não encontrado." };

  const calc = computeSale({ ...input, grossCents: quote.total_cents });
  if (!calc.ok) return { ok: false, error: calc.reason };

  const { data, error } = await supabase.rpc("close_sale", {
    p_quote_id: input.quoteId,
    p_payment_method: input.paymentMethod,
    p_doc_type: input.docType,
    p_signature_kind: input.signatureKind,
    p_signed_doc_url: input.signedDocUrl ?? null,
    p_notes: input.notes ?? null,
    p_discount_percent: input.discountPercent,
    p_discount_cents: calc.discountCents,
    p_net_cents: calc.netCents,
    p_down_payment_cents: input.downPaymentCents,
    p_installments: input.installments,
    p_first_due_date: input.firstDueDate,
    p_rows: calc.rows.map((r) => ({
      number: r.number,
      due_date: r.dueDate,
      amount_cents: r.amountCents,
    })),
  });
  if (error) return { ok: false, error: error.message };

  const saleId = (data as { sale_id: string }).sale_id;
  revalidatePath(`/orcamentos/${input.quoteId}`);
  revalidatePath("/dashboard");

  const { issueServiceInvoiceForSale } = await import("@/modules/financeiro/invoice-actions");
  await issueServiceInvoiceForSale(saleId); // silencioso: só emite se a empresa configurou e habilitou

  return { ok: true, saleId };
}
