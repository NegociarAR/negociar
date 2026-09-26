import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

export type Period = "month" | "quarter" | "year";

// data de início do período selecionado (ISO)
export function periodStart(period: Period): string {
  const d = new Date();
  if (period === "month") d.setMonth(d.getMonth(), 1);
  else if (period === "quarter") d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export const PERIOD_LABELS: Record<Period, string> = {
  month: "Este mês",
  quarter: "Últimos 3 meses",
  year: "Último ano",
};

// ---------- 1. FUNIL DE CONVERSÃO ----------
export interface Funnel {
  byStatus: Record<string, number>;
  total: number;
  sent: number; // enviados (chegaram ao cliente)
  won: number; // aprovados
  conversion: number; // % aprovados / enviados
}

export async function getFunnel(period: Period): Promise<Funnel> {
  const session = await getSession();
  const empty: Funnel = { byStatus: {}, total: 0, sent: 0, won: 0, conversion: 0 };
  if (!session?.companyId) return empty;

  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select("status")
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .gte("created_at", periodStart(period));

  const byStatus: Record<string, number> = {};
  (data ?? []).forEach((q) => {
    byStatus[q.status] = (byStatus[q.status] ?? 0) + 1;
  });

  const total = data?.length ?? 0;
  // "enviados" = qualquer status que chegou ao cliente
  const reachedClient = ["sent", "viewed", "negotiation_requested", "approved", "rejected"];
  const sent = reachedClient.reduce((s, k) => s + (byStatus[k] ?? 0), 0);
  const won = byStatus["approved"] ?? 0;
  const conversion = sent > 0 ? (won / sent) * 100 : 0;

  return { byStatus, total, sent, won, conversion };
}

// ---------- 2. FATURAMENTO ----------
export interface Revenue {
  totalCents: number;
  count: number;
  avgTicketCents: number;
  byMonth: { month: string; cents: number }[];
}

export async function getRevenue(period: Period): Promise<Revenue> {
  const session = await getSession();
  const empty: Revenue = { totalCents: 0, count: 0, avgTicketCents: 0, byMonth: [] };
  if (!session?.companyId) return empty;

  const supabase = await createClient();
  const { data } = await supabase
    .from("sales")
    .select("net_cents, total_cents, sold_at")
    .eq("company_id", session.companyId)
    .gte("sold_at", periodStart(period));

  const rows = data ?? [];
  const val = (r: { net_cents?: number; total_cents?: number }) =>
    r.net_cents ?? r.total_cents ?? 0;

  const totalCents = rows.reduce((s, r) => s + val(r), 0);
  const count = rows.length;
  const avgTicketCents = count > 0 ? Math.round(totalCents / count) : 0;

  // agrupa por mês (YYYY-MM)
  const monthMap: Record<string, number> = {};
  rows.forEach((r) => {
    const m = (r.sold_at ?? "").slice(0, 7);
    if (m) monthMap[m] = (monthMap[m] ?? 0) + val(r);
  });
  const byMonth = Object.entries(monthMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, cents]) => ({ month, cents }));

  return { totalCents, count, avgTicketCents, byMonth };
}

// ---------- 3. MOTIVOS DE RECUSA / NEGOCIAÇÃO ----------
export interface ReasonRow {
  reason: string;
  count: number;
  kind: "rejected" | "negotiation_requested";
}

export async function getReasons(period: Period): Promise<ReasonRow[]> {
  const session = await getSession();
  if (!session?.companyId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select("status, decision_reason")
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .in("status", ["rejected", "negotiation_requested"])
    .not("decision_reason", "is", null)
    .gte("created_at", periodStart(period));

  // agrupa por (motivo normalizado, tipo)
  const map = new Map<string, ReasonRow>();
  (data ?? []).forEach((q) => {
    const reason = (q.decision_reason ?? "").trim();
    if (!reason) return;
    const key = `${q.status}::${reason.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) existing.count += 1;
    else
      map.set(key, {
        reason,
        count: 1,
        kind: q.status as ReasonRow["kind"],
      });
  });

  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
}

// ---------- 4. RECEBÍVEIS (resumo) ----------
export interface ReceivablesSummary {
  toReceiveCents: number;
  overdueCents: number;
  receivedCents: number; // dentro do período
}

export async function getReceivablesSummary(
  period: Period,
): Promise<ReceivablesSummary> {
  const session = await getSession();
  const empty = { toReceiveCents: 0, overdueCents: 0, receivedCents: 0 };
  if (!session?.companyId) return empty;

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: pending } = await supabase
    .from("sale_installments")
    .select("amount_cents, due_date")
    .eq("company_id", session.companyId)
    .eq("status", "pending");

  const { data: received } = await supabase
    .from("sale_installments")
    .select("amount_cents, received_at")
    .eq("company_id", session.companyId)
    .eq("status", "received")
    .gte("received_at", periodStart(period));

  const toReceiveCents = pending?.reduce((s, r) => s + r.amount_cents, 0) ?? 0;
  const overdueCents =
    pending?.filter((r) => r.due_date < today).reduce((s, r) => s + r.amount_cents, 0) ?? 0;
  const receivedCents = received?.reduce((s, r) => s + r.amount_cents, 0) ?? 0;

  return { toReceiveCents, overdueCents, receivedCents };
}
