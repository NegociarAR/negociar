"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule, getEntitlements, checkLimit } from "@/lib/entitlements";
import { countCustomers } from "./queries";
import { KIND_LABELS, type Stage } from "./stages";

type Result = { ok: true; id?: string } | { ok: false; error: string };

function refresh(customerId?: string) {
  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  revalidatePath("/follow-ups");
  if (customerId) revalidatePath(`/clientes/${customerId}`);
}

// Cadastro rápido de lead (nome, WhatsApp, origem, valor potencial).
export async function createLead(input: {
  personType: "pf" | "pj";
  name: string;
  whatsapp: string;
  source: string;
  estimatedValueCents: number | null;
}): Promise<Result> {
  const session = await requireModule("clientes");
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Informe o nome." };

  // leads contam no limite de contatos do plano
  const ent = await getEntitlements();
  const gate = checkLimit(ent, "customers", await countCustomers());
  if (!gate.allowed) return { ok: false, error: "limit" };

  const phone = input.whatsapp.replace(/\D/g, "") || null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: session.companyId,
      person_type: input.personType,
      name: input.personType === "pf" ? name : null,
      trade_name: input.personType === "pj" ? name : null,
      whatsapp: phone,
      phone,
      stage: "lead",
      lead_source: input.source || null,
      estimated_value_cents: input.estimatedValueCents,
      last_contact_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Erro ao criar lead." };

  await supabase.from("activities").insert({
    company_id: session.companyId,
    customer_id: data.id,
    type: "lead_created",
    title: input.source ? `Lead cadastrado (origem: ${input.source})` : "Lead cadastrado",
  });
  refresh();
  return { ok: true, id: data.id };
}

// Muda o estágio: oportunidade, cliente (conversão), perdido (com motivo) ou reabre como lead.
export async function changeStage(
  customerId: string,
  stage: Stage,
  reason?: string,
): Promise<Result> {
  const session = await requireModule("clientes");
  const supabase = await createClient();
  const now = new Date().toISOString();

  const patch: Record<string, unknown> = { stage };
  let title = "";
  if (stage === "opportunity") {
    title = "Marcado como oportunidade";
  } else if (stage === "customer") {
    patch.converted_at = now;
    patch.lost_at = null;
    patch.lost_reason = null;
    title = "Lead convertido em cliente";
  } else if (stage === "lost") {
    if (!reason?.trim()) return { ok: false, error: "Informe o motivo da perda." };
    patch.lost_at = now;
    patch.lost_reason = reason.trim();
    title = `Marcado como perdido: ${reason.trim()}`;
  } else {
    patch.lost_at = null;
    patch.lost_reason = null;
    title = "Reaberto como lead";
  }

  const { error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", customerId)
    .eq("company_id", session.companyId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("activities").insert({
    company_id: session.companyId,
    customer_id: customerId,
    type: `stage_${stage}`,
    title,
  });
  refresh(customerId);
  return { ok: true };
}

export async function updateLeadInfo(
  customerId: string,
  source: string,
  estimatedValueCents: number | null,
): Promise<Result> {
  const session = await requireModule("clientes");
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ lead_source: source || null, estimated_value_cents: estimatedValueCents })
    .eq("id", customerId)
    .eq("company_id", session.companyId);
  if (error) return { ok: false, error: error.message };
  refresh(customerId);
  return { ok: true };
}

// Agenda a próxima ação (vira um follow-up com tipo).
export async function scheduleNextAction(
  customerId: string,
  kind: string,
  dueDate: string,
  note: string,
): Promise<Result> {
  const session = await requireModule("clientes");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { ok: false, error: "Informe a data." };

  const supabase = await createClient();
  const { data: own } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("company_id", session.companyId)
    .maybeSingle();
  if (!own) return { ok: false, error: "Contato não encontrado." };

  const label = KIND_LABELS[kind] ?? "Ação";
  const { error } = await supabase.from("followups").insert({
    company_id: session.companyId,
    customer_id: customerId,
    due_date: dueDate,
    kind,
    reason: note.trim() ? `${label}: ${note.trim()}` : label,
    status: "pending",
  });
  if (error) return { ok: false, error: error.message };
  refresh(customerId);
  return { ok: true };
}

// Conclui a ação: marca o follow-up como feito e registra o contato.
export async function finishNextAction(followupId: string, customerId: string): Promise<Result> {
  const session = await requireModule("clientes");
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: f } = await supabase
    .from("followups")
    .update({ status: "done", completed_at: now })
    .eq("id", followupId)
    .eq("company_id", session.companyId)
    .select("reason")
    .maybeSingle();
  if (!f) return { ok: false, error: "Ação não encontrada." };

  await supabase
    .from("customers")
    .update({ last_contact_at: now })
    .eq("id", customerId)
    .eq("company_id", session.companyId);
  await supabase.from("activities").insert({
    company_id: session.companyId,
    customer_id: customerId,
    type: "contact",
    title: `Ação concluída: ${f.reason ?? "follow-up"}`,
  });
  refresh(customerId);
  return { ok: true };
}
