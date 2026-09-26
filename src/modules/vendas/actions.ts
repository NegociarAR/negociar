"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/entitlements";
import { computeSale, type SaleInput } from "./sale-calc";

export interface CloseSaleInput extends SaleInput {
  quoteId: string;
  paymentMethod: string;
  docType: string;
  signatureKind: "aceite" | "upload";
  signedDocUrl?: string | null;
  notes?: string | null;
}

// Fecha a venda de um orçamento aprovado: grava sales + parcelas.
// Idempotente por quote_id (índice único evita duplicar).
export async function closeSale(input: CloseSaleInput) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const supabase = await createClient();

  // valida orçamento e evita venda duplicada
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, number, customer_id, status")
    .eq("id", input.quoteId)
    .eq("company_id", session.companyId)
    .maybeSingle();
  if (!quote) return { ok: false, error: "Orçamento não encontrado." };

  const { data: existing } = await supabase
    .from("sales")
    .select("id")
    .eq("quote_id", input.quoteId)
    .maybeSingle();
  if (existing) return { ok: false, error: "Este orçamento já virou venda." };

  // recalcula no server (não confia nos números do client)
  const calc = computeSale(input);
  if (!calc.ok) return { ok: false, error: calc.reason };

  // cria a venda
  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .insert({
      company_id: session.companyId,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      status: "won",
      total_cents: calc.netCents,
      gross_cents: input.grossCents,
      discount_percent: input.discountPercent,
      discount_cents: calc.discountCents,
      net_cents: calc.netCents,
      down_payment_cents: input.downPaymentCents,
      installments: input.installments,
      first_due_date: input.firstDueDate,
      payment_method: input.paymentMethod,
      doc_type: input.docType,
      signature_kind: input.signatureKind,
      signed_at: new Date().toISOString(),
      signed_doc_url: input.signedDocUrl ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (saleErr || !sale) {
    return { ok: false, error: saleErr?.message ?? "Erro ao criar venda." };
  }

  // grava as parcelas
  const rows = calc.rows.map((r) => ({
    sale_id: sale.id,
    company_id: session.companyId,
    number: r.number,
    due_date: r.dueDate,
    amount_cents: r.amountCents,
    status: "pending" as const,
  }));
  await supabase.from("sale_installments").insert(rows);

  // marca orçamento como aprovado (se ainda não estava) e registra timeline
  await supabase
    .from("quotes")
    .update({ status: "approved", decided_at: new Date().toISOString() })
    .eq("id", quote.id)
    .eq("company_id", session.companyId);

  await supabase.from("activities").insert({
    company_id: session.companyId,
    customer_id: quote.customer_id,
    type: "sale",
    title: `Venda fechada — orçamento #${quote.number}`,
  });

  revalidatePath(`/orcamentos/${quote.id}`);
  revalidatePath("/dashboard");
  return { ok: true, saleId: sale.id };
}
