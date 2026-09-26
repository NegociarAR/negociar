"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/entitlements";

// data de hoje + N dias em YYYY-MM-DD
function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function createFollowup(formData: FormData) {
  const session = await requireModule("clientes");
  if (!session?.companyId) redirect("/login");

  const customer_id = String(formData.get("customer_id") ?? "");
  const due_date = String(formData.get("due_date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!customer_id || !due_date) {
    redirect("/follow-ups?erro=Preencha%20cliente%20e%20data");
  }

  const supabase = await createClient();
  await supabase.from("followups").insert({
    company_id: session.companyId,
    customer_id,
    due_date,
    reason,
    notes,
    status: "pending",
  });

  revalidatePath("/follow-ups");
  redirect("/follow-ups");
}

export async function completeFollowup(id: string) {
  const session = await requireModule("clientes");
  if (!session?.companyId) return;
  const supabase = await createClient();
  await supabase
    .from("followups")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", session.companyId);
  revalidatePath("/follow-ups");
}

export async function cancelFollowup(id: string) {
  const session = await requireModule("clientes");
  if (!session?.companyId) return;
  const supabase = await createClient();
  await supabase
    .from("followups")
    .update({ status: "canceled" })
    .eq("id", id)
    .eq("company_id", session.companyId);
  revalidatePath("/follow-ups");
}

// Sugestão automática usada ao enviar um orçamento.
// Cria um follow-up "retornar em N dias" vinculado ao orçamento/cliente.
// Reutilizável a partir de sendQuote.
export async function suggestFollowupForQuote(params: {
  companyId: string;
  customerId: string;
  quoteId: string;
  quoteNumber: number;
  days: number;
}) {
  // exportada de arquivo "use server" = endpoint público; confere o chamador
  const session = await requireModule("orcamentos");
  if (session?.companyId !== params.companyId) return;
  const supabase = await createClient();
  await supabase.from("followups").insert({
    company_id: params.companyId,
    customer_id: params.customerId,
    quote_id: params.quoteId,
    due_date: addDaysISO(params.days),
    reason: `Retornar sobre orçamento #${params.quoteNumber}`,
    status: "pending",
  });
}

// Reabre um follow-up concluído (volta a pendente).
export async function reopenFollowup(id: string) {
  const session = await requireModule("clientes");
  if (!session?.companyId) return;
  const supabase = await createClient();
  await supabase
    .from("followups")
    .update({ status: "pending", completed_at: null })
    .eq("id", id)
    .eq("company_id", session.companyId);
  revalidatePath("/follow-ups");
}
