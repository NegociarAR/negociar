import { createClient } from "@/lib/supabase/server";
import type { FiscalSettings } from "./fiscal-types";

export async function getFiscalSettings(companyId: string): Promise<FiscalSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_fiscal_settings")
    .select(
      "onboarding_status, onboarding_error, environment, municipal_service_code, cnae_code, tax_regime, iss_rate, municipal_registration, address_street, address_number, address_complement, address_district, address_city, address_state, address_zip_code, ibge_city_code, auto_issue",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  return {
    onboardingStatus: (data?.onboarding_status as FiscalSettings["onboardingStatus"]) ?? "not_started",
    onboardingError: data?.onboarding_error ?? null,
    environment: (data?.environment as FiscalSettings["environment"]) ?? "homologacao",
    municipalServiceCode: data?.municipal_service_code ?? null,
    cnaeCode: data?.cnae_code ?? null,
    taxRegime: (data?.tax_regime as FiscalSettings["taxRegime"]) ?? null,
    issRate: data?.iss_rate ?? null,
    municipalRegistration: data?.municipal_registration ?? null,
    autoIssue: data?.auto_issue ?? false,
    address: {
      street: data?.address_street ?? "",
      number: data?.address_number ?? "",
      complement: data?.address_complement ?? "",
      district: data?.address_district ?? "",
      city: data?.address_city ?? "",
      state: data?.address_state ?? "",
      zipCode: data?.address_zip_code ?? "",
      ibgeCityCode: data?.ibge_city_code ?? "",
    },
  };
}
