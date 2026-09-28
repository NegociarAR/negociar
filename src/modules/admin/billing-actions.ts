"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

type Result = { ok: true; n?: number } | { ok: false; error: string };

async function adminSupabase() {
  const s = await getSession();
  if (!s?.isAdmin) throw new Error("Acesso negado.");
  return { supabase: await createClient(), userId: s.user.id };
}

function done(): Result {
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
  return { ok: true };
}

// Gera as mensalidades do mês para todas as empresas ativas com plano pago.
export async function generateInvoices(period: string, dueDay: number): Promise<Result> {
  const { supabase } = await adminSupabase();
  const { data, error } = await supabase.rpc("billing_generate", { p_period: period, p_due_day: dueDay });
  if (error) return { ok: false, error: error.message };
  done();
  return { ok: true, n: (data as number) ?? 0 };
}

export async function createInvoice(input: {
  companyId: string;
  description: string;
  amountCents: number;
  dueDate: string;
}): Promise<Result> {
  const { supabase, userId } = await adminSupabase();
  if (!input.companyId) return { ok: false, error: "Escolha a empresa." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return { ok: false, error: "Informe o vencimento." };
  if (!(input.amountCents > 0)) return { ok: false, error: "Informe o valor." };

  const { error } = await supabase.from("billing_invoices").insert({
    company_id: input.companyId,
    reference_period: input.dueDate.slice(0, 7),
    description: input.description.trim() || null,
    amount_cents: input.amountCents,
    due_date: input.dueDate,
    created_by: userId,
  });
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Já existe título dessa empresa para essa referência." : error.message };
  }
  return done();
}

// Baixa manual do título (pagamento recebido).
export async function markPaid(id: string, method: string, amountCents: number | null, paidDate: string | null): Promise<Result> {
  const { supabase } = await adminSupabase();
  const { error } = await supabase.rpc("billing_mark_paid", {
    p_invoice: id,
    p_method: method || null,
    p_amount: amountCents,
    p_paid_at: paidDate ? `${paidDate}T12:00:00-03:00` : null,
  });
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function reopenInvoice(id: string): Promise<Result> {
  const { supabase } = await adminSupabase();
  const { error } = await supabase.rpc("billing_reopen", { p_invoice: id });
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function cancelInvoice(id: string): Promise<Result> {
  const { supabase } = await adminSupabase();
  const { error } = await supabase.from("billing_invoices").update({ status: "canceled" }).eq("id", id).eq("status", "open");
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function blockCompany(companyId: string): Promise<Result> {
  const { supabase } = await adminSupabase();
  const { error } = await supabase.rpc("billing_block", { p_company: companyId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/empresas/${companyId}`);
  return done();
}

export async function unblockCompany(companyId: string): Promise<Result> {
  const { supabase } = await adminSupabase();
  const { error } = await supabase.rpc("billing_unblock", { p_company: companyId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/empresas/${companyId}`);
  return done();
}

export async function blockEligible(): Promise<Result> {
  const { supabase } = await adminSupabase();
  const { data, error } = await supabase.rpc("billing_block_eligible");
  if (error) return { ok: false, error: error.message };
  done();
  return { ok: true, n: (data as number) ?? 0 };
}

export async function saveBillingSettings(graceDays: number, instructions: string): Promise<Result> {
  const { supabase } = await adminSupabase();
  if (!(graceDays >= 0 && graceDays <= 60)) return { ok: false, error: "Tolerância entre 0 e 60 dias." };
  const { error } = await supabase
    .from("platform_settings")
    .update({ grace_days: graceDays, payment_instructions: instructions.trim() || null })
    .eq("singleton", true);
  if (error) return { ok: false, error: error.message };
  return done();
}

// Isenta (ou remove a isenção de) uma empresa de cobrança. Ao isentar, cancela títulos em aberto.
export async function setBillingExempt(companyId: string, exempt: boolean): Promise<Result> {
  const { supabase } = await adminSupabase();
  const { data, error } = await supabase.rpc("billing_set_exempt", { p_company: companyId, p_exempt: exempt });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/empresas/${companyId}`);
  done();
  return { ok: true, n: (data as number) ?? 0 };
}
