import { createClient } from "@/lib/supabase/server";
import type { FiscalSettings } from "./fiscal-types";

export async function getFiscalSettings(companyId: string): Promise<FiscalSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_fiscal_settings")
    .select("enabled, auto_issue, environment, api_token, municipal_service_code, cnae_code, tax_regime, iss_rate")
    .eq("company_id", companyId)
    .maybeSingle();

  return {
    enabled: data?.enabled ?? false,
    autoIssue: data?.auto_issue ?? false,
    environment: (data?.environment as FiscalSettings["environment"]) ?? "homologacao",
    hasToken: Boolean(data?.api_token),
    municipalServiceCode: data?.municipal_service_code ?? null,
    cnaeCode: data?.cnae_code ?? null,
    taxRegime: (data?.tax_regime as FiscalSettings["taxRegime"]) ?? null,
    issRate: data?.iss_rate ?? null,
  };
}
