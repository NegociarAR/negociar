"use server";

import { currentPeriod } from "@/lib/period";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule, getEntitlements, checkLimit } from "@/lib/entitlements";
import { suggestFollowupForQuote } from "@/modules/followups/actions";

export interface ItemInput {
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
}

export interface CreateQuoteInput {
  customer_id: string;
  items: ItemInput[];
  discount_cents: number;
  valid_until: string | null;
  payment_terms: string | null;
  delivery_terms: string | null;
  notes: string | null;
}

// Item 8 (auditoria): criação e edição de orçamento passaram a ser uma
// única transação no banco (funções create_quote/edit_quote) — ou grava
// tudo (orçamento + itens + timeline + contador), ou não grava nada.

export async function createQuote(input: CreateQuoteInput) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  if (!input.customer_id) return { ok: false, error: "Selecione um cliente." };
  const items = input.items.filter((i) => i.description.trim() && i.quantity > 0);
  if (items.length === 0) return { ok: false, error: "Adicione ao menos um item." };

  // GATE: limite mensal de orçamentos (checagem amigável antes de tentar gravar;
  // increment_usage dentro da transação ainda protege contra corrida)
  const ent = await getEntitlements();
  const period = currentPeriod();
  const supabase = await createClient();
  const { data: usage } = await supabase
    .from("usage_counters")
    .select("count")
    .eq("company_id", session.companyId)
    .eq("metric", "quotes_created")
    .eq("period", period)
    .maybeSingle();
  const gate = checkLimit(ent, "quotes_per_month", usage?.count ?? 0);
  if (!gate.allowed) {
    return {
      ok: false,
      limit: true,
      error: `Você atingiu o limite de ${gate.limit} orçamentos por mês do seu plano.`,
    };
  }

  const { data, error } = await supabase.rpc("create_quote", {
    p_company: session.companyId,
    p_customer: input.customer_id,
    p_items: items,
    p_discount_cents: input.discount_cents,
    p_valid_until: input.valid_until,
    p_payment_terms: input.payment_terms,
    p_delivery_terms: input.delivery_terms,
    p_notes: input.notes,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/orcamentos");
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteQuote(id: string) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) redirect("/login");
  const supabase = await createClient();

  // item 18: não deixa excluir orçamento que já virou venda
  const { data: sale } = await supabase
    .from("sales")
    .select("id")
    .eq("quote_id", id)
    .maybeSingle();
  if (sale) {
    redirect(`/orcamentos/${id}?erro=Orçamento+com+venda+não+pode+ser+excluído`);
  }

  await supabase
    .from("quotes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", session.companyId);
  revalidatePath("/orcamentos");
  redirect("/orcamentos");
}

// Marca o orçamento como enviado (draft -> sent), registra timeline
// e cria um follow-up automático "retornar em N dias" (0 = não criar).
export async function sendQuote(id: string, followupDays = 3) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, number, status, customer_id")
    .eq("id", id)
    .eq("company_id", session.companyId)
    .maybeSingle();
  if (!quote) return { ok: false, error: "Orçamento não encontrado." };

  // só avança se ainda for rascunho
  if (quote.status === "draft") {
    await supabase
      .from("quotes")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", session.companyId);

    await supabase.from("quote_status_history").insert({
      quote_id: id,
      company_id: session.companyId,
      status: "sent",
      changed_by: session.user.id,
    });

    await supabase.from("activities").insert({
      company_id: session.companyId,
      customer_id: quote.customer_id,
      type: "quote_sent",
      title: `Orçamento #${quote.number} enviado`,
    });

    // sugestão automática de follow-up
    if (followupDays > 0) {
      await suggestFollowupForQuote({
        companyId: session.companyId,
        customerId: quote.customer_id,
        quoteId: quote.id,
        quoteNumber: quote.number,
        days: followupDays,
      });
    }
  }

  revalidatePath(`/orcamentos/${id}`);
  revalidatePath("/follow-ups");
  return { ok: true };
}

// Muda status manualmente pelo dono (ex.: marcar negociação, aprovado).
export async function updateQuoteStatus(id: string, status: string) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  // item 11: só os destinos que a máquina de estados aceita a partir de
  // um status manual (não inclui "draft" — voltar a rascunho não é permitido)
  const valid = ["sent", "viewed", "negotiation", "approved", "rejected", "canceled"];
  if (!valid.includes(status)) return { ok: false, error: "Status inválido." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "approved" || status === "rejected") {
    patch.decided_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("quotes")
    .update(patch)
    .eq("id", id)
    .eq("company_id", session.companyId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("quote_status_history").insert({
    quote_id: id,
    company_id: session.companyId,
    status,
    changed_by: session.user.id,
  });

  revalidatePath(`/orcamentos/${id}`);
  return { ok: true };
}

// Edita um orçamento. Se for rascunho, edita no lugar. Se já foi enviado
// (sent/viewed/negotiation/negotiation_requested), cria uma revisão v+1
// e aplica as mudanças nela — tudo em uma única transação (edit_quote).
export async function editQuote(
  quoteId: string,
  input: {
    customer_id: string;
    items: { product_id: string | null; description: string; quantity: number; unit_price_cents: number }[];
    discount_cents: number;
    valid_until: string | null;
    payment_terms: string | null;
    delivery_terms: string | null;
    notes: string | null;
  },
) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const items = input.items.filter((i) => i.description.trim() && i.quantity > 0);
  if (items.length === 0) return { ok: false, error: "Adicione ao menos um item." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("edit_quote", {
    p_quote_id: quoteId,
    p_customer: input.customer_id,
    p_items: items,
    p_discount_cents: input.discount_cents,
    p_valid_until: input.valid_until,
    p_payment_terms: input.payment_terms,
    p_delivery_terms: input.delivery_terms,
    p_notes: input.notes,
  });
  if (error) return { ok: false, error: error.message };

  const targetId = (data as { id: string }).id;
  revalidatePath(`/orcamentos/${targetId}`);
  revalidatePath("/orcamentos");
  return { ok: true, id: targetId };
}

// Cancela um orçamento (encerra sem apagar — vira histórico).
export async function cancelQuote(id: string) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotes")
    .update({ status: "canceled", decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", session.companyId);
  if (error) return { ok: false, error: error.message };
  await supabase.from("quote_status_history").insert({
    quote_id: id,
    company_id: session.companyId,
    status: "canceled",
    changed_by: session.user.id,
  });
  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  return { ok: true };
}
