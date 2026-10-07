"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

type Result = { ok: true } | { ok: false; error: string };

// Salva a API key do Asaas da PRÓPRIA empresa (usada pra cobrar os
// clientes dela nos recebíveis). Campo de API key vazio = mantém a que já
// está salva, só atualiza o ambiente.
export async function saveAsaasClientSettings(input: {
  apiKey: string;
  environment: "sandbox" | "producao";
}): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    company_id: session.companyId,
    environment: input.environment,
  };
  if (input.apiKey.trim()) {
    patch.api_key = input.apiKey.trim();
    patch.enabled = true;
  }

  const { error } = await supabase
    .from("company_asaas_client_settings")
    .upsert(patch, { onConflict: "company_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function disableAsaasClientBilling(): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_asaas_client_settings")
    .update({ enabled: false })
    .eq("company_id", session.companyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/configuracoes");
  return { ok: true };
}
