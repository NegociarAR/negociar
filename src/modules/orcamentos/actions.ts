"use server";

import { currentPeriod } from "@/lib/period";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession, getEntitlements, checkLimit } from "@/lib/entitlements";
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

// incrementa contador mensal via RPC (atômica, sem race condition, sem escrita direta)
async function bumpQuoteUsage(companyId: string) {
  const supabase = await createClient();
  const period = currentPeriod();
  await supabase.rpc("increment_usage", {
    p_company: companyId,
    p_metric: "quotes_created",
    p_period: period,
  });
}

export async function createQuote(input: CreateQuoteInput) {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  if (!input.customer_id) return { ok: false, error: "Selecione um cliente." };
  const items = input.items.filter(
    (i) => i.description.trim() && i.quantity > 0,
  );
  if (items.length === 0)
    return { ok: false, error: "Adicione ao menos um item." };

  // GATE: limite mensal de orçamentos
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

  // totais
  const subtotal = items.reduce(
    (s, i) => s + Math.round(i.quantity * i.unit_price_cents),
    0,
  );
  const total = Math.max(0, subtotal - input.discount_cents);

  // número sequencial por empresa (RPC)
  const { data: number, error: numErr } = await supabase.rpc(
    "next_quote_number",
    { p_company: session.companyId },
  );
  if (numErr) return { ok: false, error: numErr.message };

  // cria orçamento
  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      company_id: session.companyId,
      customer_id: input.customer_id,
      number,
      status: "draft",
      discount_cents: input.discount_cents,
      subtotal_cents: subtotal,
      total_cents: total,
      valid_until: input.valid_until,
      payment_terms: input.payment_terms,
      delivery_terms: input.delivery_terms,
      notes: input.notes,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // itens
  const rows = items.map((i, idx) => ({
    quote_id: quote.id,
    company_id: session.companyId,
    product_id: i.product_id,
    description: i.description.trim(),
    quantity: i.quantity,
    unit_price_cents: i.unit_price_cents,
    total_cents: Math.round(i.quantity * i.unit_price_cents),
    sort_order: idx,
  }));
  await supabase.from("quote_items").insert(rows);

  // timeline do cliente + contador de uso
  await supabase.from("activities").insert({
    company_id: session.companyId,
    customer_id: input.customer_id,
    type: "quote_created",
    title: `Orçamento #${number} criado`,
  });
  await bumpQuoteUsage(session.companyId);

  revalidatePath("/orcamentos");
  return { ok: true, id: quote.id as string };
}

export async function deleteQuote(id: string) {
  const session = await getSession();
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
  const session = await getSession();
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
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  const valid = ["draft", "sent", "viewed", "negotiation", "approved", "rejected"];
  if (!valid.includes(status)) return { ok: false, error: "Status inválido." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "approved" || status === "rejected") {
    patch.decided_at = new Date().toISOString();
  }
  await supabase
    .from("quotes")
    .update(patch)
    .eq("id", id)
    .eq("company_id", session.companyId);

  await supabase.from("quote_status_history").insert({
    quote_id: id,
    company_id: session.companyId,
    status,
    changed_by: session.user.id,
  });

  revalidatePath(`/orcamentos/${id}`);
  return { ok: true };
}

// Recalcula totais e regrava itens de um orçamento (rascunho editável).
async function rewriteQuoteContent(
  quoteId: string,
  companyId: string,
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
  const supabase = await createClient();
  const subtotal = input.items.reduce(
    (s, i) => s + Math.round(i.quantity * i.unit_price_cents),
    0,
  );
  const total = Math.max(0, subtotal - input.discount_cents);

  await supabase
    .from("quotes")
    .update({
      customer_id: input.customer_id,
      discount_cents: input.discount_cents,
      subtotal_cents: subtotal,
      total_cents: total,
      valid_until: input.valid_until,
      payment_terms: input.payment_terms,
      delivery_terms: input.delivery_terms,
      notes: input.notes,
    })
    .eq("id", quoteId)
    .eq("company_id", companyId);

  // substitui os itens
  await supabase.from("quote_items").delete().eq("quote_id", quoteId);
  await supabase.from("quote_items").insert(
    input.items.map((i, idx) => ({
      quote_id: quoteId,
      company_id: companyId,
      product_id: i.product_id,
      description: i.description,
      quantity: i.quantity,
      unit_price_cents: i.unit_price_cents,
      total_cents: Math.round(i.quantity * i.unit_price_cents),
      sort_order: idx,
    })),
  );
}

// Edita um orçamento. Se for rascunho, edita no lugar. Se já foi enviado
// (sent/viewed/negotiation/negotiation_requested), cria uma revisão v+1
// e aplica as mudanças nela. Retorna o id a ser aberto.
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
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, status")
    .eq("id", quoteId)
    .eq("company_id", session.companyId)
    .maybeSingle();
  if (!quote) return { ok: false, error: "Orçamento não encontrado." };

  // aprovado/recusado/substituído não editam
  if (["approved", "rejected", "superseded"].includes(quote.status)) {
    return { ok: false, error: "Este orçamento não pode mais ser editado." };
  }

  let targetId = quoteId;

  // já enviado -> cria revisão e edita a nova versão
  if (quote.status !== "draft") {
    const { data: newId, error } = await supabase.rpc("create_quote_revision", {
      p_quote_id: quoteId,
    });
    if (error || !newId) {
      return { ok: false, error: error?.message ?? "Erro ao criar revisão." };
    }
    targetId = newId as string;
  }

  await rewriteQuoteContent(targetId, session.companyId, input);

  revalidatePath(`/orcamentos/${targetId}`);
  revalidatePath("/orcamentos");
  return { ok: true, id: targetId };
}

// Cancela um orçamento (encerra sem apagar — vira histórico).
export async function cancelQuote(id: string) {
  const session = await getSession();
  if (!session?.companyId) return { ok: false };
  const supabase = await createClient();
  await supabase
    .from("quotes")
    .update({ status: "canceled", decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", session.companyId);
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
