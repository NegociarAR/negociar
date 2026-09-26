"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { sendEmail } from "@/lib/email";

async function assertAdmin() {
  const session = await getSession();
  if (!session?.isAdmin) throw new Error("Não autorizado.");
  return session;
}

// e-mail do dono da empresa (para notificações)
async function ownerEmail(companyId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("email")
    .eq("id", companyId)
    .maybeSingle();
  return data?.email ?? null;
}

export async function approveCompany(companyId: string) {
  await assertAdmin();
  const supabase = await createClient();
  await supabase
    .from("companies")
    .update({ status: "active" })
    .eq("id", companyId);

  const email = await ownerEmail(companyId);
  if (email) {
    await sendEmail({
      to: email,
      subject: "Seu acesso foi liberado",
      html: `<p>Boa notícia! Seu cadastro foi aprovado e o acesso à plataforma já está liberado.</p><p>É só entrar com seu e-mail e senha.</p>`,
    });
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/empresas/${companyId}`);
}

export async function suspendCompany(companyId: string) {
  await assertAdmin();
  const supabase = await createClient();
  await supabase
    .from("companies")
    .update({ status: "suspended" })
    .eq("id", companyId);
  revalidatePath("/admin");
  revalidatePath(`/admin/empresas/${companyId}`);
}

export async function reactivateCompany(companyId: string) {
  await assertAdmin();
  const supabase = await createClient();
  await supabase
    .from("companies")
    .update({ status: "active" })
    .eq("id", companyId);
  revalidatePath("/admin");
  revalidatePath(`/admin/empresas/${companyId}`);
}

// Troca o plano da empresa (assinatura ativa).
export async function changePlan(companyId: string, planId: string) {
  await assertAdmin();
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("company_id", companyId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (sub) {
    await supabase
      .from("subscriptions")
      .update({ plan_id: planId })
      .eq("id", sub.id);
  } else {
    await supabase
      .from("subscriptions")
      .insert({ company_id: companyId, plan_id: planId, status: "active" });
  }

  revalidatePath(`/admin/empresas/${companyId}`);
}

// Marca vencimento (controle manual de pagamento).
export async function setPeriodEnd(companyId: string, dateISO: string) {
  await assertAdmin();
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("company_id", companyId)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  if (sub) {
    await supabase
      .from("subscriptions")
      .update({ current_period_end: dateISO || null })
      .eq("id", sub.id);
  }
  revalidatePath(`/admin/empresas/${companyId}`);
}

// Aprova uma solicitação de plano: troca o plano e marca como resolvida.
export async function approvePlanRequest(requestId: string) {
  await assertAdmin();
  const supabase = await createClient();

  const { data: req } = await supabase
    .from("plan_requests")
    .select("company_id, requested_plan_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { ok: false };

  // troca o plano da assinatura ativa
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("company_id", req.company_id)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  if (sub) {
    await supabase.from("subscriptions").update({ plan_id: req.requested_plan_id }).eq("id", sub.id);
  } else {
    await supabase.from("subscriptions").insert({
      company_id: req.company_id,
      plan_id: req.requested_plan_id,
      status: "active",
    });
  }

  await supabase
    .from("plan_requests")
    .update({ status: "approved", resolved_at: new Date().toISOString() })
    .eq("id", requestId);

  revalidatePath("/admin");
  return { ok: true };
}

export async function rejectPlanRequest(requestId: string) {
  await assertAdmin();
  const supabase = await createClient();
  await supabase
    .from("plan_requests")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("id", requestId);
  revalidatePath("/admin");
  return { ok: true };
}
