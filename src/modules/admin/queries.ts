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
  owner_email: string | null;
}

// Garante que quem chama é admin; caso contrário retorna null.
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.isAdmin) return null;
  return session;
}

export async function listCompanies(filter?: string) {
  const admin = await requireAdmin();
  if (!admin) return [];

  const supabase = await createClient();
  let query = supabase
    .from("companies")
    .select(
      "id, name, status, created_at, subscriptions(plan_id, current_period_end, status, plans(name))",
    )
    .order("created_at", { ascending: false });

  if (filter === "pending" || filter === "active" || filter === "suspended") {
    query = query.eq("status", filter);
  }

  const { data } = await query;
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    name: string;
    status: AdminCompany["status"];
    created_at: string;
    subscriptions: Array<{
      plan_id: string;
      current_period_end: string | null;
      status: string;
      plans: { name: string } | null;
    }>;
  }>;

  return rows.map((r) => {
    const sub = r.subscriptions?.find(
      (s) => s.status === "active" || s.status === "trialing",
    );
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      created_at: r.created_at,
      plan_id: sub?.plan_id ?? null,
      plan_name: sub?.plans?.name ?? null,
      current_period_end: sub?.current_period_end ?? null,
      owner_email: null,
    } as AdminCompany;
  });
}

export async function getCompanyDetail(id: string) {
  const admin = await requireAdmin();
  if (!admin) return null;

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select(
      "id, name, legal_name, cnpj, email, phone, city, state, status, created_at",
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
