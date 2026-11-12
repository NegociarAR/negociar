import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "./queries";

// ─── 1. Visão geral de negócio ───────────────────────────────────────────────

export interface BusinessOverview {
  counts: { pending: number; active: number; suspended: number };
  byPlan: Array<{ plan_id: string; plan_name: string; count: number }>;
  newLast30: number;
  mrrCents: number;
}

export async function getBusinessOverview(): Promise<BusinessOverview | null> {
  const admin = await requireAdmin();
  if (!admin) return null;
  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingRes, activeRes, suspendedRes, newRes, subsRes] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    supabase.from("companies").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase
      .from("subscriptions")
      .select("plan_id, plans(name, price_cents), companies(billing_exempt)")
      .in("status", ["active", "trialing"]),
  ]);

  const subs = (subsRes.data ?? []) as unknown as Array<{
    plan_id: string;
    plans: { name: string; price_cents: number } | null;
    companies: { billing_exempt: boolean | null } | null;
  }>;

  // MRR: apenas assinaturas não-isentas
  const mrrCents = subs
    .filter((s) => !s.companies?.billing_exempt)
    .reduce((acc, s) => acc + (s.plans?.price_cents ?? 0), 0);

  // Distribuição por plano
  const planMap = new Map<string, { plan_name: string; count: number }>();
  for (const s of subs) {
    const pid = s.plan_id;
    const existing = planMap.get(pid);
    if (existing) {
      existing.count++;
    } else {
      planMap.set(pid, { plan_name: s.plans?.name ?? pid, count: 1 });
    }
  }
  const byPlan = Array.from(planMap.entries())
    .map(([plan_id, v]) => ({ plan_id, ...v }))
    .sort((a, b) => b.count - a.count);

  return {
    counts: {
      pending: pendingRes.count ?? 0,
      active: activeRes.count ?? 0,
      suspended: suspendedRes.count ?? 0,
    },
    byPlan,
    newLast30: newRes.count ?? 0,
    mrrCents,
  };
}

// ─── 2. Adoção de funcionalidades ────────────────────────────────────────────

export interface FeatureAdoption {
  feature: string;
  usedCount: number;
  totalActive: number;
  pct: number;
}

export async function getFeatureAdoption(): Promise<FeatureAdoption[] | null> {
  const admin = await requireAdmin();
  if (!admin) return null;
  const supabase = await createClient();

  // denominador: empresas ativas
  const { count: totalActive } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const total = totalActive ?? 0;
  if (total === 0) return [];

  // buscar IDs de empresas ativas para subqueries
  const { data: activeCompanies } = await supabase
    .from("companies")
    .select("id")
    .eq("status", "active");
  const activeIds = (activeCompanies ?? []).map((c) => c.id as string);

  const [asaasRes, appfinRes, fiscalRes, recurringRes, reminderRes, teamRes, templatesRes, hourlyRes] =
    await Promise.all([
      supabase
        .from("company_asaas_client_settings")
        .select("company_id", { count: "exact", head: true })
        .eq("enabled", true)
        .in("company_id", activeIds),
      supabase
        .from("company_appfinancasbr_settings")
        .select("company_id", { count: "exact", head: true })
        .eq("enabled", true)
        .in("company_id", activeIds),
      supabase
        .from("company_fiscal_settings")
        .select("company_id", { count: "exact", head: true })
        .eq("onboarding_status", "active")
        .in("company_id", activeIds),
      supabase
        .from("recurring_charges")
        .select("company_id")
        .in("company_id", activeIds),
      supabase
        .from("company_notification_settings")
        .select("company_id", { count: "exact", head: true })
        .eq("client_due_reminder_enabled", true)
        .in("company_id", activeIds),
      supabase
        .from("company_users")
        .select("company_id")
        .in("company_id", activeIds),
      supabase
        .from("quote_templates")
        .select("company_id")
        .in("company_id", activeIds),
      supabase
        .from("quotes")
        .select("company_id")
        .eq("is_hourly_contract", true)
        .in("company_id", activeIds),
    ]);

  // Empresas com cobrança recorrente (distinct)
  const recurringIds = new Set((recurringRes.data ?? []).map((r) => r.company_id as string));
  // Equipe: empresas com 2+ membros
  const memberCount = new Map<string, number>();
  for (const r of teamRes.data ?? []) {
    memberCount.set(r.company_id, (memberCount.get(r.company_id) ?? 0) + 1);
  }
  const teamCount = [...memberCount.values()].filter((n) => n >= 2).length;
  // Templates (distinct)
  const templateIds = new Set((templatesRes.data ?? []).map((r) => r.company_id as string));
  // Faturamento por hora (distinct)
  const hourlyIds = new Set((hourlyRes.data ?? []).map((r) => r.company_id as string));

  const features: Array<{ feature: string; usedCount: number }> = [
    { feature: "Asaas", usedCount: asaasRes.count ?? 0 },
    { feature: "AppFinançasBr", usedCount: appfinRes.count ?? 0 },
    { feature: "Fiscal / NFS-e", usedCount: fiscalRes.count ?? 0 },
    { feature: "Cobrança recorrente", usedCount: recurringIds.size },
    { feature: "Lembrete ao cliente", usedCount: reminderRes.count ?? 0 },
    { feature: "Equipe (2+ membros)", usedCount: teamCount },
    { feature: "Templates de orçamento", usedCount: templateIds.size },
    { feature: "Faturamento por hora", usedCount: hourlyIds.size },
  ];

  return features
    .map((f) => ({ ...f, totalActive: total, pct: Math.round((f.usedCount / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);
}

// ─── 3. Ranking de empresas mais ativas ──────────────────────────────────────

export interface ActiveCompany {
  companyId: string;
  companyName: string;
  actions: number;
}

export async function getTopActiveCompanies(
  days = 30,
  limit = 15,
): Promise<ActiveCompany[] | null> {
  const admin = await requireAdmin();
  if (!admin) return null;
  const supabase = await createClient();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("audit_log")
    .select("company_id, companies(name)")
    .gte("changed_at", since)
    .not("company_id", "is", null);

  if (!data) return [];

  // agrupar por company_id
  const counts = new Map<string, { name: string; count: number }>();
  for (const row of data) {
    const cid = row.company_id as string;
    const name = (row as { companies?: { name?: string } }).companies?.name ?? cid;
    const existing = counts.get(cid);
    if (existing) {
      existing.count++;
    } else {
      counts.set(cid, { name, count: 1 });
    }
  }

  return Array.from(counts.entries())
    .map(([companyId, v]) => ({ companyId, companyName: v.name, actions: v.count }))
    .sort((a, b) => b.actions - a.actions)
    .slice(0, limit);
}

// ─── 4. Saúde técnica ────────────────────────────────────────────────────────

export interface InvoiceError {
  companyName: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface TechnicalHealth {
  invoiceErrors: InvoiceError[];
  overdueInstallments: number;
  cronNote: string;
}

export async function getTechnicalHealth(): Promise<TechnicalHealth | null> {
  const admin = await requireAdmin();
  if (!admin) return null;
  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [invoiceRes, installmentRes] = await Promise.all([
    supabase
      .from("service_invoices")
      .select("error_message, created_at, companies(name)")
      .eq("status", "error")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("sale_installments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("due_date", thirtyDaysAgo),
  ]);

  const invoiceErrors = (invoiceRes.data ?? []).map((r) => ({
    companyName: (r as { companies?: { name?: string } }).companies?.name ?? "—",
    errorMessage: r.error_message ?? null,
    createdAt: r.created_at as string,
  }));

  return {
    invoiceErrors,
    overdueInstallments: installmentRes.count ?? 0,
    cronNote: "Não há tabela de log de execução do cron nesta versão.",
  };
}
