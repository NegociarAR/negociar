import { createClient } from "@/lib/supabase/server";
import type { AsaasClientSettings } from "./asaas-client-types";

function baseAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://negociaroficial.vercel.app").replace(/\/$/, "");
}

// Config de cobrança automática (Asaas) que a PRÓPRIA empresa usa para
// cobrar os clientes dela nos recebíveis. Cria a linha com valores padrão
// no primeiro acesso (webhook_token já sai pronto), para a empresa poder
// copiar a URL do webhook antes mesmo de colar a API key.
export async function getAsaasClientSettings(companyId: string): Promise<AsaasClientSettings> {
  const supabase = await createClient();
  let { data } = await supabase
    .from("company_asaas_client_settings")
    .select("environment, api_key, enabled")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!data) {
    const { data: inserted } = await supabase
      .from("company_asaas_client_settings")
      .insert({ company_id: companyId })
      .select("environment, api_key, enabled")
      .maybeSingle();
    data = inserted;
  }

  return {
    enabled: data?.enabled ?? false,
    environment: (data?.environment as AsaasClientSettings["environment"]) ?? "sandbox",
    apiKeyMasked: data?.api_key ? `••••${data.api_key.slice(-4)}` : null,
    webhookUrl: `${baseAppUrl()}/api/webhooks/asaas-cliente/${companyId}`,
  };
}
