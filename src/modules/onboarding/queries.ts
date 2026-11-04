import { createClient } from "@/lib/supabase/server";
import { getSession, getEntitlements, hasModule } from "@/lib/entitlements";

export interface OnboardingProgress {
  hasCompanyData: boolean;   // name != "Minha empresa" && phone IS NOT NULL
  hasCustomer: boolean;
  hasProduct: boolean;
  hasQuote: boolean;
  teamModuleEnabled: boolean;
  hasTeamInvite: boolean;    // >= 2 membros em company_users (owner + pelo menos 1 convidado)
  issuesInvoices: boolean | null;
  fiscalConfigured: boolean; // onboarding_status = 'active' em company_fiscal_settings
  dismissed: boolean;
  completedCount: number;
  totalCount: number;
}

export async function getOnboardingProgress(): Promise<OnboardingProgress | null> {
  const session = await getSession();
  if (!session?.companyId) return null;

  const ent = await getEntitlements();
  const companyId = session.companyId;
  const supabase = await createClient();

  const [
    companyRes,
    customersRes,
    productsRes,
    quotesRes,
    teamRes,
    fiscalRes,
    onboardingRes,
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("name, phone")
      .eq("id", companyId)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("company_users")
      .select("user_id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("company_fiscal_settings")
      .select("onboarding_status")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("company_onboarding")
      .select("dismissed, issues_invoices")
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  const company = companyRes.data;
  const hasCompanyData =
    Boolean(company?.name && company.name !== "Minha empresa") &&
    Boolean(company?.phone);

  const hasCustomer = (customersRes.count ?? 0) > 0;
  const hasProduct = (productsRes.count ?? 0) > 0;
  const hasQuote = (quotesRes.count ?? 0) > 0;

  const teamModuleEnabled = hasModule(ent, "teams");
  const hasTeamInvite = (teamRes.count ?? 0) >= 2;

  const issuesInvoices = (onboardingRes.data?.issues_invoices as boolean | null) ?? null;
  const fiscalConfigured =
    (fiscalRes.data?.onboarding_status as string | null) === "active";
  const dismissed = onboardingRes.data?.dismissed ?? false;

  // Itens obrigatórios (sempre contam)
  const required = [hasCompanyData, hasCustomer, hasQuote];
  // Produto: sempre conta como item
  const always = [...required, hasProduct];

  // Itens condicionais
  const conditional: boolean[] = [];
  if (teamModuleEnabled) conditional.push(hasTeamInvite);
  if (issuesInvoices === true) conditional.push(fiscalConfigured);

  const all = [...always, ...conditional];
  const completedCount = all.filter(Boolean).length;
  const totalCount = all.length;

  return {
    hasCompanyData,
    hasCustomer,
    hasProduct,
    hasQuote,
    teamModuleEnabled,
    hasTeamInvite,
    issuesInvoices,
    fiscalConfigured,
    dismissed,
    completedCount,
    totalCount,
  };
}
