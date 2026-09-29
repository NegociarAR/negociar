"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/entitlements";

type Result = { ok: true; id?: string } | { ok: false; error: string };

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

// Soma as horas do período x taxa, gera a fatura (venda) já aprovada.
export async function generateHourlyInvoice(quoteId: string, period: string, dueDate: string): Promise<Result> {
  await requireModule("orcamentos");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_hourly_invoice", {
    p_quote_id: quoteId,
    p_period: period,
    p_due_date: dueDate,
  });
  if (error) return { ok: false, error: error.message };
  refresh(quoteId);
  return { ok: true, id: (data as { sale_id: string } | null)?.sale_id };
}
