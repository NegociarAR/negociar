"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/entitlements";

export interface RecurringCharge {
  id: string;
  customer_id: string;
  customer_name: string | null;
  description: string;
  amount_cents: number;
  period: "monthly";
  day_of_month: number;
  next_due_date: string;
  active: boolean;
  last_generated_sale_id: string | null;
  created_at: string;
}

function customerName(c: {
  person_type?: string;
  name?: string | null;
  trade_name?: string | null;
  legal_name?: string | null;
} | null): string | null {
  if (!c) return null;
  if (c.person_type === "pf") return c.name ?? null;
  return c.trade_name ?? c.legal_name ?? null;
}

export async function listRecurringCharges(): Promise<RecurringCharge[]> {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_charges")
    .select("*, customers(person_type, name, trade_name, legal_name)")
    .eq("company_id", session.companyId)
    .order("next_due_date", { ascending: true });

  return (data ?? []).map((r) => {
    const c = (r as { customers?: unknown }).customers as Parameters<typeof customerName>[0] | null;
    return {
      id: r.id,
      customer_id: r.customer_id,
      customer_name: customerName(c),
      description: r.description,
      amount_cents: r.amount_cents,
      period: r.period as "monthly",
      day_of_month: r.day_of_month,
      next_due_date: r.next_due_date,
      active: r.active,
      last_generated_sale_id: r.last_generated_sale_id,
      created_at: r.created_at,
    };
  });
}

export interface CreateRecurringChargeInput {
  customerId: string;
  description: string;
  amountCents: number;
  dayOfMonth: number;
  startDate?: string; // ISO date, opcional; default: próximo dayOfMonth a partir de hoje
  quoteId?: string;
}

function nextDueDateFor(dayOfMonth: number, startDate?: string): string {
  const base = startDate ? new Date(startDate + "T00:00:00") : new Date();
  const year = base.getFullYear();
  const month = base.getMonth(); // 0-based

  // tenta o dia neste mês
  const candidate = new Date(year, month, dayOfMonth);
  if (candidate >= base) return candidate.toISOString().slice(0, 10);

  // senão, próximo mês
  const next = new Date(year, month + 1, dayOfMonth);
  return next.toISOString().slice(0, 10);
}

export async function createRecurringCharge(input: CreateRecurringChargeInput) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  if (input.amountCents <= 0) return { ok: false, error: "Valor deve ser maior que zero." };
  if (input.dayOfMonth < 1 || input.dayOfMonth > 28) return { ok: false, error: "Dia deve ser entre 1 e 28." };

  const supabase = await createClient();
  const nextDueDate = nextDueDateFor(input.dayOfMonth, input.startDate);

  const { error } = await supabase.from("recurring_charges").insert({
    company_id: session.companyId,
    customer_id: input.customerId,
    description: input.description,
    amount_cents: input.amountCents,
    day_of_month: input.dayOfMonth,
    next_due_date: nextDueDate,
    quote_id: input.quoteId ?? null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/recebiveis");
  return { ok: true };
}

export async function pauseRecurringCharge(id: string) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_charges")
    .update({ active: false })
    .eq("id", id)
    .eq("company_id", session.companyId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/recebiveis");
  return { ok: true };
}

export async function resumeRecurringCharge(id: string) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_charges")
    .update({ active: true })
    .eq("id", id)
    .eq("company_id", session.companyId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/recebiveis");
  return { ok: true };
}

export async function deleteRecurringCharge(id: string) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const supabase = await createClient();

  // Só permite excluir se nunca gerou cobrança
  const { data: charge } = await supabase
    .from("recurring_charges")
    .select("last_generated_sale_id")
    .eq("id", id)
    .eq("company_id", session.companyId)
    .maybeSingle();

  if (!charge) return { ok: false, error: "Recorrência não encontrada." };
  if (charge.last_generated_sale_id) {
    return {
      ok: false,
      error: "Essa recorrência já gerou cobranças — pause em vez de excluir.",
    };
  }

  const { error } = await supabase
    .from("recurring_charges")
    .delete()
    .eq("id", id)
    .eq("company_id", session.companyId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/recebiveis");
  return { ok: true };
}

export async function getRecurringChargeByQuote(quoteId: string): Promise<RecurringCharge | null> {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_charges")
    .select("*, customers(person_type, name, trade_name, legal_name)")
    .eq("company_id", session.companyId)
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (!data) return null;
  const c = (data as { customers?: unknown }).customers as Parameters<typeof customerName>[0] | null;
  return {
    id: data.id,
    customer_id: data.customer_id,
    customer_name: customerName(c),
    description: data.description,
    amount_cents: data.amount_cents,
    period: data.period as "monthly",
    day_of_month: data.day_of_month,
    next_due_date: data.next_due_date,
    active: data.active,
    last_generated_sale_id: data.last_generated_sale_id,
    created_at: data.created_at,
  };
}
