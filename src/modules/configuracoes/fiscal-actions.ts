"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

type Result = { ok: true } | { ok: false; error: string };

// Salva a configuração fiscal. O token só é sobrescrito se o usuário
// digitar um novo — campo vazio mantém o token já salvo (nunca exibido
// de volta por segurança).
export async function saveFiscalSettings(input: {
  environment: "homologacao" | "producao";
  apiToken: string; // vazio = não alterar
  municipalServiceCode: string;
  cnaeCode: string;
  taxRegime: string;
  issRate: string;
  enabled: boolean;
  autoIssue: boolean;
}): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  if (input.enabled && (!input.municipalServiceCode.trim() || !input.taxRegime)) {
    return { ok: false, error: "Preencha o código de serviço e o regime tributário antes de habilitar." };
  }

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    company_id: session.companyId,
    environment: input.environment,
    municipal_service_code: input.municipalServiceCode.trim() || null,
    cnae_code: input.cnaeCode.trim() || null,
    tax_regime: input.taxRegime || null,
    iss_rate: input.issRate ? Number(input.issRate.replace(",", ".")) : null,
    enabled: input.enabled,
    auto_issue: input.enabled && input.autoIssue,
  };
  if (input.apiToken.trim()) patch.api_token = input.apiToken.trim();

  const { error } = await supabase.from("company_fiscal_settings").upsert(patch, { onConflict: "company_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}
