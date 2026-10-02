"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/entitlements";

type Result = { ok: true; id: string } | { ok: false; error: string };

// Duplica um orçamento (qualquer status, inclusive cancelado/recusado —
// serve como ponto de partida pra um pedido recorrente do mesmo cliente).
// Reaproveita a RPC create_quote já existente: nasce como rascunho novo,
// número novo, sem copiar validade antiga (pode já estar vencida), e
// entra no limite mensal do plano como qualquer orçamento novo.
export async function duplicateQuote(quoteId: string): Promise<Result> {
  const session = await requireModule("orcamentos");
  const supabase = await createClient();

  const { data: original } = await supabase
    .from("quotes")
    .select("customer_id, discount_cents, payment_terms, delivery_terms, notes")
    .eq("id", quoteId)
    .eq("company_id", session.companyId)
    .maybeSingle();
  if (!original) return { ok: false, error: "Orçamento não encontrado." };

  const { data: items } = await supabase
    .from("quote_items")
    .select("product_id, description, quantity, unit_price_cents")
    .eq("quote_id", quoteId)
    .order("sort_order");
  if (!items || items.length === 0) return { ok: false, error: "Orçamento sem itens para duplicar." };

  const { data, error } = await supabase.rpc("create_quote", {
    p_company: session.companyId,
    p_customer: original.customer_id,
    p_items: items,
    p_discount_cents: original.discount_cents,
    p_valid_until: null,
    p_payment_terms: original.payment_terms,
    p_delivery_terms: original.delivery_terms,
    p_notes: original.notes,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/orcamentos");
  return { ok: true, id: (data as { id: string }).id };
}
