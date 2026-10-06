"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/entitlements";
import { sendEmail } from "@/lib/email";

type Result = { ok: true; id?: string } | { ok: false; error: string };
type TokenResult = { ok: true; token: string } | { ok: false; error: string };

function refresh(quoteId: string) {
  revalidatePath(`/orcamentos/${quoteId}`);
  revalidatePath(`/orcamentos/${quoteId}/horas`);
  revalidatePath("/recebiveis");
  revalidatePath("/dashboard");
}

// Ativa (ou desativa) o contrato por hora de um orçamento aprovado.
export async function setHourlyContract(quoteId: string, rateCents: number, active: boolean): Promise<Result> {
  await requireModule("orcamentos");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_hourly_contract", {
    p_quote_id: quoteId,
    p_rate_cents: rateCents,
    p_active: active,
  });
  if (error) return { ok: false, error: error.message };
  refresh(quoteId);
  return { ok: true };
}

// Lança horas trabalhadas num dia (data + horas + descrição).
export async function addHourEntry(input: {
  quoteId: string;
  date: string;
  hours: number;
  description: string;
}): Promise<Result> {
  const session = await requireModule("orcamentos");
  if (!input.date) return { ok: false, error: "Informe a data." };
  if (!(input.hours > 0)) return { ok: false, error: "Informe as horas." };

  const supabase = await createClient();
  const { error } = await supabase.from("quote_hour_entries").insert({
    quote_id: input.quoteId,
    company_id: session.companyId,
    entry_date: input.date,
    hours: input.hours,
    description: input.description.trim() || null,
    created_by: session.user.id,
  });
  if (error) return { ok: false, error: error.message };
  refresh(input.quoteId);
  return { ok: true };
}

export async function deleteHourEntry(entryId: string, quoteId: string): Promise<Result> {
  const session = await requireModule("orcamentos");
  const supabase = await createClient();
  const { error } = await supabase
    .from("quote_hour_entries")
    .delete()
    .eq("id", entryId)
    .eq("company_id", session.companyId);
  if (error) return { ok: false, error: error.message };
  refresh(quoteId);
  return { ok: true };
}

// Fatura um conjunto arbitrário de lançamentos (qualquer data/mês),
// substituindo o antigo faturamento por mês fechado.
export async function generateHourlyInvoiceBatch(
  quoteId: string,
  entryIds: string[],
  dueDate: string,
): Promise<Result> {
  await requireModule("orcamentos");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_hourly_invoice_batch", {
    p_quote_id: quoteId,
    p_entry_ids: entryIds,
    p_due_date: dueDate,
  });
  if (error) return { ok: false, error: error.message };
  const saleId = (data as { sale_id: string } | null)?.sale_id;
  refresh(quoteId);
  if (saleId) {
    const { issueServiceInvoiceForSale } = await import("@/modules/financeiro/invoice-actions");
    await issueServiceInvoiceForSale(saleId); // silencioso: só emite se a empresa configurou e habilitou
  }
  return { ok: true, id: saleId };
}

// Gera um resumo prévio das horas selecionadas para o cliente validar.
// Não bloqueia: a fatura pode ser gerada a qualquer momento, independente
// da resposta — é só um indicador visual (pendente/aprovado/contestado).
export async function createHourSummary(quoteId: string, entryIds: string[]): Promise<TokenResult> {
  await requireModule("orcamentos");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_hour_summary", {
    p_quote_id: quoteId,
    p_entry_ids: entryIds,
  });
  if (error) return { ok: false, error: error.message };
  refresh(quoteId);
  return { ok: true, token: (data as { token: string }).token };
}

export async function sendHourSummaryEmail(quoteId: string, summaryUrl: string): Promise<Result> {
  const session = await requireModule("orcamentos");
  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("number, customers(email)")
    .eq("id", quoteId)
    .eq("company_id", session.companyId)
    .maybeSingle();

  const email = (quote as { customers?: { email?: string | null } } | null)?.customers?.email;
  if (!email) return { ok: false, error: "Cliente sem e-mail cadastrado." };

  const res = await sendEmail({
    to: email,
    subject: `Resumo de horas — Orçamento #${quote?.number}`,
    html: `<p>Olá! Segue o resumo das horas lançadas para sua validação:</p><p><a href="${summaryUrl}">${summaryUrl}</a></p>`,
  });
  if (!res.ok) return { ok: false, error: "Falha ao enviar e-mail." };
  return { ok: true };
}
