import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

export interface AdminCompany {
  id: string;
  name: string;
  status: "pending" | "active" | "suspended";
  created_at: string;
  plan_id: string | null;
  plan_name: string | null;
  current_period_end: string | null;
  is_expired: boolean;
  billing_exempt: boolean;
  owner_email: string | null;
}

// Garante que quem chama é admin; caso contrário retorna null.
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.isAdmin) return null;
  return session;
}

export async function listCompanies(filter?: string, search?: string) {
  const admin = await requireAdmin();
  if (!admin) return [];

  const supabase = await createClient();
  let query = supabase
    .from("companies")
    .select(
      "id, name, status, created_at, billing_exempt, subscriptions(plan_id, current_period_end, status, plans(name))",
    )
    .order("created_at", { ascending: false });

  if (filter === "pending" || filter === "active" || filter === "suspended") {
    query = query.eq("status", filter);
  }

  if (search?.trim()) {
    const s = `%${search.trim()}%`;
    query = query.or(`name.ilike.${s},cnpj.ilike.${s}`);
  }

  const { data } = await query;
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    name: string;
    status: AdminCompany["status"];
    created_at: string;
    billing_exempt: boolean | null;
    subscriptions: Array<{
      plan_id: string;
      current_period_end: string | null;
      status: string;
      plans: { name: string } | null;
    }>;
  }>;

  const today = new Date().toISOString();

  return rows.map((r) => {
    const sub = r.subscriptions?.find(
      (s) => s.status === "active" || s.status === "trialing",
    );
    const periodEnd = sub?.current_period_end ?? null;
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      created_at: r.created_at,
      plan_id: sub?.plan_id ?? null,
      plan_name: sub?.plans?.name ?? null,
      current_period_end: periodEnd,
      is_expired: Boolean(periodEnd && periodEnd < today),
      billing_exempt: Boolean(r.billing_exempt),
      owner_email: null,
    } as AdminCompany;
  });
}

// Item 7 (auditoria): assinaturas vencidas não rebaixam sozinhas —
// aparecem aqui para o admin decidir manualmente (cobrar, renovar ou suspender).
export async function expiredSubscriptions() {
  const admin = await requireAdmin();
  if (!admin) return [];

  const supabase = await createClient();
  const today = new Date().toISOString();
  const { data } = await supabase
    .from("subscriptions")
    .select("company_id, current_period_end, plan_id, companies!inner(name, billing_exempt), plans(name)")
    .eq("companies.billing_exempt", false)
    .in("status", ["active", "trialing"])
    .not("current_period_end", "is", null)
    .lt("current_period_end", today);

  return (data ?? []).map((r) => ({
    companyId: r.company_id,
    companyName: (r as { companies?: { name?: string } }).companies?.name ?? "—",
    planName: (r as { plans?: { name?: string } }).plans?.name ?? r.plan_id,
    expiredAt: r.current_period_end as string,
  }));
}

export async function getCompanyDetail(id: string) {
  const admin = await requireAdmin();
  if (!admin) return null;

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
        .select(
      "id, name, legal_name, cnpj, email, phone, city, state, status, created_at, billing_exempt, billing_method",
    )
    .eq("id", id)
    .maybeSingle();
  if (!company) return null;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status, current_period_end, plans(name)")
    .eq("company_id", id)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  // dono/contato
  const { data: owner } = await supabase
    .from("company_users")
    .select("user_id, role")
    .eq("company_id", id)
    .eq("role", "owner")
    .maybeSingle();

  return { company, sub, owner };
}

// contadores para os filtros do topo
export async function companyCounts() {
  const admin = await requireAdmin();
  if (!admin) return { pending: 0, active: 0, suspended: 0 };
  const supabase = await createClient();
  const q = (status: string) =>
    supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
  const [p, a, s] = await Promise.all([q("pending"), q("active"), q("suspended")]);
  return {
    pending: p.count ?? 0,
    active: a.count ?? 0,
    suspended: s.count ?? 0,
  };
}

export interface CompanyUsage {
  customers: number;
  products: number;
  quotesThisMonth: number;
  limits: { customers: number | null; products: number | null; quotes_per_month: number | null };
}

export async function getCompanyUsage(companyId: string): Promise<CompanyUsage | null> {
  const admin = await requireAdmin();
  if (!admin) return null;

  const supabase = await createClient();
  const period = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  const [customersRes, productsRes, usageRes, subRes] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("company_id", companyId).is("deleted_at", null),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", companyId).is("deleted_at", null),
    supabase.from("usage_counters").select("count").eq("company_id", companyId).eq("metric", "quotes_created").eq("period", period).maybeSingle(),
    supabase.from("subscriptions").select("plans(limits)").eq("company_id", companyId).in("status", ["active", "trialing"]).limit(1).maybeSingle(),
  ]);

  const planLimits = ((subRes.data as { plans?: { limits?: Record<string, number | null> } } | null)?.plans?.limits ?? {}) as Record<string, number | null>;

  return {
    customers: customersRes.count ?? 0,
    products: productsRes.count ?? 0,
    quotesThisMonth: usageRes.data?.count ?? 0,
    limits: {
      customers: planLimits.customers ?? null,
      products: planLimits.products ?? null,
      quotes_per_month: planLimits.quotes_per_month ?? null,
    },
  };
}

export interface MonthCount { month: string; count: number }

export async function getQuotesPerMonth(companyId: string, months = 6): Promise<MonthCount[]> {
  const admin = await requireAdmin();
  if (!admin) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("usage_counters")
    .select("period, count")
    .eq("company_id", companyId)
    .eq("metric", "quotes_created")
    .order("period", { ascending: true })
    .limit(months);

  // preenche meses sem registro com 0
  const result: MonthCount[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const found = (data ?? []).find((r) => r.period === key);
    result.push({ month: key, count: found?.count ?? 0 });
  }
  return result;
}

// Solicitações de plano pendentes (para o painel admin).
export async function pendingPlanRequests() {
  const admin = await requireAdmin();
  if (!admin) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_requests")
    .select("id, company_id, requested_plan_id, current_plan_id, note, created_at, companies(name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id,
    companyId: r.company_id,
    companyName: (r as { companies?: { name?: string } }).companies?.name ?? "—",
    requestedPlan: r.requested_plan_id,
    currentPlan: r.current_plan_id,
    note: r.note,
    createdAt: r.created_at,
  }));
}
