import { currentPeriod } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";
import { getSession, getEntitlements } from "@/lib/entitlements";

export interface CompanyData {
  id: string;
  name: string;
  legal_name: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  logo_url: string | null;
}

export async function getCompanyData(): Promise<CompanyData | null> {
  const session = await getSession();
  if (!session?.companyId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name, legal_name, cnpj, email, phone, address, city, state, zip_code, logo_url")
    .eq("id", session.companyId)
    .maybeSingle();
  return (data as CompanyData) ?? null;
}

export interface PlanInfo {
  planId: string;
  planName: string;
  priceCents: number;
  status: string;
  currentPeriodEnd: string | null;
  usage: {
    customers: { used: number; limit: number | null };
    products: { used: number; limit: number | null };
    quotesThisMonth: { used: number; limit: number | null };
  };
}

export async function getPlanInfo(): Promise<PlanInfo | null> {
  const session = await getSession();
  if (!session?.companyId) return null;
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status, current_period_end, plans(name, price_cents, limits)")
    .eq("company_id", session.companyId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  const plan = (sub as { plans?: unknown } | null)?.plans as
    | { name: string; price_cents: number; limits: Record<string, number | null> }
    | undefined;
  if (!sub || !plan) return null;

  // contagens de uso
  const period = currentPeriod();
  const [customers, products, quotes] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true })
      .eq("company_id", session.companyId).is("deleted_at", null),
    supabase.from("products").select("id", { count: "exact", head: true })
      .eq("company_id", session.companyId).is("deleted_at", null),
    supabase.from("usage_counters").select("count")
      .eq("company_id", session.companyId).eq("metric", "quotes_created").eq("period", period).maybeSingle(),
  ]);

  const lim = (k: string) => (plan.limits?.[k] === undefined ? null : plan.limits[k]);

  return {
    planId: sub.plan_id,
    planName: plan.name,
    priceCents: plan.price_cents,
    status: sub.status,
    currentPeriodEnd: sub.current_period_end,
    usage: {
      customers: { used: customers.count ?? 0, limit: lim("customers") },
      products: { used: products.count ?? 0, limit: lim("products") },
      quotesThisMonth: { used: quotes.data?.count ?? 0, limit: lim("quotes_per_month") },
    },
  };
}

// catálogo de planos (para a tela de upgrade)
export async function listPlans() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("id, name, price_cents, modules, limits")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}

// Solicitação de plano pendente da empresa (se houver).
export async function pendingPlanRequest() {
  const session = await getSession();
  if (!session?.companyId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_requests")
    .select("id, requested_plan_id, created_at, plans!plan_requests_requested_plan_id_fkey(name)")
    .eq("company_id", session.companyId)
    .eq("status", "pending")
    .maybeSingle();
  if (!data) return null;
  const plan = (data as { plans?: { name?: string } }).plans;
  return { id: data.id, planName: plan?.name ?? data.requested_plan_id, createdAt: data.created_at };
}
