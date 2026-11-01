"use server";

import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/entitlements";
import { revalidatePath } from "next/cache";

export async function getNotificationSettings() {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_notification_settings")
    .select("*")
    .eq("company_id", session.companyId)
    .single();
  return data ?? { company_id: session.companyId, client_due_reminder_enabled: false };
}

export async function saveNotificationSettings(input: { client_due_reminder_enabled: boolean }) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Empresa não encontrada." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_notification_settings")
    .upsert({ company_id: session.companyId, ...input, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/configuracoes");
  return { ok: true };
}
