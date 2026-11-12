import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "./queries";

export interface DrillRow { id: string; label: string; detail?: string }

// ─── 1. Visão geral de negócio ───────────────────────────────────────────────

export interface BusinessOverview {
  counts: { pending: number; active: number; suspended: number };
  companiesByStatus: Record<"pending" | "active" | "suspended", DrillRow[]>;
  byPlan: Array<{ plan_id: string; plan_name: string; count: number; companies: DrillRow[] }>;
  newLast30: number;
  newCompanies: Array<DrillRow & { created_at: string }>;
  mrrCents: number;
  payingSubscriptions: DrillRow[];
}

export async function getBusinessOverview(): Promise<BusinessOverview | null> {
  const admin = await requireAdmin();
  if (!admin) return null;
  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [allCompaniesRes, newRes, subsRes] = await Promise.all([
    supabase.from("companies").select("id, name, status, created_at").order("name"),
    supabase
      .from("companies")
      .select("id, name, created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("company_id, plan_id, plans(name, price_cents), companies(id, name, billing_exempt)")
      .in("status", ["active", "trialing"]),
  ]);

  const allCompanies = (allCompaniesRes.data ?? []) as Array<{
    id: string; name: string; status: string; created_at: string;
  }>;

  const companiesByStatus: Record<"pending" | "active" | "suspended", DrillRow[]> = {
    pending: [],
    active: [],
    suspended: [],
  };
  const counts = { pending: 0, active: 0, suspended: 0 };
  for (const c of allCompanies) {
    const st = c.status as "pending" | "active" | "suspended";
    if (st in counts) {
      counts[st]++;
      companiesByStatus[st].push({ id: c.id, label: c.name, detail: `Desde ${new Date(c.created_at).toLocaleDateString("pt-BR")}` });
    }
  }

  const newCompaniesData = (newRes.data ?? []) as Array<{ id: string; name: string; created_at: string }>;
  const newCompanies = newCompaniesData.map((c) => ({
    id: c.id,
    label: c.name,
    detail: new Date(c.created_at).toLocaleDateString("pt-BR"),
    created_at: c.created_at,
  }));

  const subs = (subsRes.data ?? []) as unknown as Array<{
    company_id: string;
    plan_id: string;
    plans: { name: string; price_cents: number } | null;
    companies: { id: string; name: string; billing_exempt: boolean | null } | null;
  }>;

  const mrrCents = subs
    .filter((s) => !s.companies?.billing_exempt)
    .reduce((acc, s) => acc + (s.plans?.price_cents ?? 0), 0);

  const payingSubscriptions: DrillRow[] = subs
    .filter((s) => !s.companies?.billing_exempt)
    .map((s) => ({
      id: s.companies?.id ?? s.company_id,
      label: s.companies?.name ?? s.company_id,
      detail: `${s.plans?.name ?? s.plan_id} · ${((s.plans?.price_cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // distribuição por plano com lista
  const planMap = new Map<string, { plan_name: string; count: number; companies: DrillRow[] }>();
  for (const s of subs) {
    const pid = s.plan_id;
    const compRow: DrillRow = {
      id: s.companies?.id ?? s.company_id,
      label: s.companies?.name ?? s.company_id,
    };
    const existing = planMap.get(pid);
    if (existing) {
      existing.count++;
      existing.companies.push(compRow);
    } else {
      planMap.set(pid, { plan_name: s.plans?.name ?? pid, count: 1, companies: [compRow] });
    }
  }
  const byPlan = Array.from(planMap.entries())
    .map(([plan_id, v]) => ({ plan_id, ...v }))
    .sort((a, b) => b.count - a.count);

  return {
    counts,
    companiesByStatus,
    byPlan,
    newLast30: newCompanies.length,
    newCompanies,
    mrrCents,
    payingSubscriptions,
  };
}

// ─── 2. Adoção de funcionalidades ────────────────────────────────────────────

export interface FeatureAdoption {
  feature: string;
  usedCount: number;
  totalActive: number;
  pct: number;
  companies: DrillRow[];
}

export async function getFeatureAdoption(): Promise<FeatureAdoption[] | null> {
  const admin = await requireAdmin();
  if (!admin) return null;
  const supabase = await createClient();

  const { data: activeCompanies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("status", "active");

  const active = (activeCompanies ?? []) as Array<{ id: string; name: string }>;
  const total = active.length;
  if (total === 0) return [];

  const activeIds = active.map((c) => c.id);
  const nameById = new Map(active.map((c) => [c.id, c.name]));

  const toRows = (ids: string[]): DrillRow[] =>
    ids.map((id) => ({ id, label: nameById.get(id) ?? id })).sort((a, b) => a.label.localeCompare(b.label));

  const [asaasRes, appfinRes, fiscalRes, recurringRes, reminderRes, teamRes, templatesRes, hourlyRes] =
    await Promise.all([
      supabase.from("company_asaas_client_settings").select("company_id").eq("enabled", true).in("company_id", activeIds),
      supabase.from("company_appfinancasbr_settings").select("company_id").eq("enabled", true).in("company_id", activeIds),
      supabase.from("company_fiscal_settings").select("company_id").eq("onboarding_status", "active").in("company_id", activeIds),
      supabase.from("recurring_charges").select("company_id").in("company_id", activeIds),
      supabase.from("company_notification_settings").select("company_id").eq("client_due_reminder_enabled", true).in("company_id", activeIds),
      supabase.from("company_users").select("company_id").in("company_id", activeIds),
      supabase.from("quote_templates").select("company_id").in("company_id", activeIds),
      supabase.from("quotes").select("company_id").eq("is_hourly_contract", true).in("company_id", activeIds),
    ]);

  const uniq = (rows: Array<{ company_id: string }>) => [...new Set(rows.map((r) => r.company_id))];

  const memberCount = new Map<string, number>();
  for (const r of teamRes.data ?? []) {
    memberCount.set(r.company_id, (memberCount.get(r.company_id) ?? 0) + 1);
  }
  const teamIds = [...memberCount.entries()].filter(([, n]) => n >= 2).map(([id]) => id);

  const features: Array<{ feature: string; ids: string[] }> = [
    { feature: "Asaas", ids: uniq(asaasRes.data ?? []) },
    { feature: "AppFinançasBr", ids: uniq(appfinRes.data ?? []) },
    { feature: "Fiscal / NFS-e", ids: uniq(fiscalRes.data ?? []) },
    { feature: "Cobrança recorrente", ids: uniq(recurringRes.data ?? []) },
    { feature: "Lembrete ao cliente", ids: uniq(reminderRes.data ?? []) },
    { feature: "Equipe (2+ membros)", ids: teamIds },
    { feature: "Templates de orçamento", ids: uniq(templatesRes.data ?? []) },
    { feature: "Faturamento por hora", ids: uniq(hourlyRes.data ?? []) },
  ];

  return features
    .map((f) => ({
      feature: f.feature,
      usedCount: f.ids.length,
      totalActive: total,
      pct: Math.round((f.ids.length / total) * 100),
      companies: toRows(f.ids),
    }))
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
  companyId: string;
  companyName: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface OverdueInstallment {
  companyId: string;
  companyName: string;
  dueDate: string;
  amountCents: number;
}

export interface TechnicalHealth {
  invoiceErrors: InvoiceError[];
  overdueInstallments: number;
  overdueList: OverdueInstallment[];
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
      .select("company_id, error_message, created_at, companies(id, name)")
      .eq("status", "error")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("sale_installments")
      .select("company_id, due_date, amount_cents, companies(id, name)")
      .eq("status", "pending")
      .lt("due_date", thirtyDaysAgo)
      .order("due_date", { ascending: true })
      .limit(50),
  ]);

  const invoiceErrors: InvoiceError[] = (invoiceRes.data ?? []).map((r) => {
    const c = (r as { companies?: { id?: string; name?: string } }).companies;
    return {
      companyId: c?.id ?? (r.company_id as string),
      companyName: c?.name ?? "—",
      errorMessage: r.error_message ?? null,
      createdAt: r.created_at as string,
    };
  });

  const overdueList: OverdueInstallment[] = (installmentRes.data ?? []).map((r) => {
    const c = (r as { companies?: { id?: string; name?: string } }).companies;
    return {
      companyId: c?.id ?? (r.company_id as string),
      companyName: c?.name ?? "—",
      dueDate: r.due_date as string,
      amountCents: r.amount_cents as number,
    };
  });

  return {
    invoiceErrors,
    overdueInstallments: overdueList.length,
    overdueList,
    cronNote: "Não há tabela de log de execução do cron nesta versão.",
  };
}
