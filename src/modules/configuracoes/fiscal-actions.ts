"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { registerCompanyEmitter } from "@/lib/nfse/focus-nfe-client";

type Result = { ok: true } | { ok: false; error: string };

// Salva os dados cadastrais fiscais (sem disparar nada na Focus NFe
// ainda — isso é feito à parte, em registerFiscalCompany, junto do
// upload do certificado).
export async function saveFiscalSettings(input: {
  environment: "homologacao" | "producao";
  municipalServiceCode: string;
  cnaeCode: string;
  taxRegime: string;
  issRate: string;
  municipalRegistration: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  ibgeCityCode: string;
  autoIssue: boolean;
}): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const supabase = await createClient();
  const { error } = await supabase.from("company_fiscal_settings").upsert(
    {
      company_id: session.companyId,
      environment: input.environment,
      municipal_service_code: input.municipalServiceCode.trim() || null,
      cnae_code: input.cnaeCode.trim() || null,
      tax_regime: input.taxRegime || null,
      iss_rate: input.issRate ? Number(input.issRate.replace(",", ".")) : null,
      municipal_registration: input.municipalRegistration.trim() || null,
      address_street: input.street.trim() || null,
      address_number: input.number.trim() || null,
      address_complement: input.complement.trim() || null,
      address_district: input.district.trim() || null,
      address_city: input.city.trim() || null,
      address_state: input.state.trim().toUpperCase() || null,
      address_zip_code: input.zipCode.replace(/\D/g, "") || null,
      ibge_city_code: input.ibgeCityCode.trim() || null,
      auto_issue: input.autoIssue,
    },
    { onConflict: "company_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}

// Cadastra a empresa como emitente na Focus NFe (token de REVENDA, da
// variável de ambiente — nunca por empresa). O certificado chega aqui
// via upload (FormData), é convertido para base64 em memória e enviado
// nesta mesma chamada — nunca gravado em disco, nunca salvo no banco,
// nunca logado. Só o token que a Focus NFe devolve (específico desta
// empresa) é persistido, para as emissões futuras.
export async function registerFiscalCompany(formData: FormData): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const resellerToken = process.env.FOCUS_NFE_RESELLER_TOKEN;
  if (!resellerToken) return { ok: false, error: "Integração fiscal não configurada pelo NEGOCIAR ainda." };

  const certFile = formData.get("certificate") as File | null;
  const certPassword = String(formData.get("certificatePassword") ?? "");
  if (!certFile || certFile.size === 0) return { ok: false, error: "Selecione o arquivo do certificado digital (.pfx)." };
  if (!certPassword) return { ok: false, error: "Informe a senha do certificado." };

  const supabase = await createClient();
  const [{ data: company }, { data: settings }] = await Promise.all([
    supabase.from("companies").select("cnpj, legal_name, name, email").eq("id", session.companyId).maybeSingle(),
    supabase
      .from("company_fiscal_settings")
      .select("environment, municipal_registration, tax_regime, address_street, address_number, address_complement, address_district, address_city, address_state, address_zip_code, ibge_city_code")
      .eq("company_id", session.companyId)
      .maybeSingle(),
  ]);

  if (!company?.cnpj) return { ok: false, error: "Cadastre o CNPJ da empresa em Configurações antes de continuar." };
  if (!settings?.tax_regime || !settings.municipal_registration || !settings.address_street || !settings.ibge_city_code) {
    return { ok: false, error: "Preencha todos os dados fiscais (endereço, inscrição municipal, regime) antes de cadastrar o certificado." };
  }

  // arquivo em memória só pelo tempo desta função — nunca tocado em disco
  const certBase64 = Buffer.from(await certFile.arrayBuffer()).toString("base64");

  const result = await registerCompanyEmitter(resellerToken, (settings.environment as "homologacao" | "producao") ?? "homologacao", {
    cnpj: company.cnpj.replace(/\D/g, ""),
    legalName: company.legal_name ?? company.name,
    tradeName: company.name,
    email: company.email ?? "",
    municipalRegistration: settings.municipal_registration,
    taxRegime: settings.tax_regime as "mei" | "simples_nacional" | "lucro_presumido" | "lucro_real",
    address: {
      street: settings.address_street,
      number: settings.address_number ?? "",
      complement: settings.address_complement,
      district: settings.address_district ?? "",
      city: settings.address_city ?? "",
      state: settings.address_state ?? "",
      zipCode: settings.address_zip_code ?? "",
      ibgeCityCode: settings.ibge_city_code,
    },
    certificateBase64: certBase64,
    certificatePassword: certPassword,
  });

  if (!result.ok) {
    await supabase
      .from("company_fiscal_settings")
      .update({ onboarding_status: "error", onboarding_error: result.errorMessage })
      .eq("company_id", session.companyId);
    revalidatePath("/configuracoes");
    return { ok: false, error: result.errorMessage ?? "Não foi possível cadastrar na Focus NFe." };
  }

  await supabase
    .from("company_fiscal_settings")
    .update({
      onboarding_status: "active",
      onboarding_error: null,
      focus_company_id: result.focusCompanyId,
      api_token: result.apiToken,
      enabled: true,
    })
    .eq("company_id", session.companyId);

  revalidatePath("/configuracoes");
  return { ok: true };
}
