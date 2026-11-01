import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { getTeam } from "@/modules/team/queries";

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

// intervalo [início, fim) do período ANTERIOR equivalente — para comparação
function previousPeriodRange(period: Period): { start: string; end: string } {
  const end = periodStart(period);
  const start = new Date(end);
  if (period === "month") start.setMonth(start.getMonth() - 1);
  else if (period === "quarter") start.setMonth(start.getMonth() - 3);
  else start.setFullYear(start.getFullYear() - 1);
  return { start: start.toISOString(), end };
}

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
  previousTotalCents: number;
  variancePct: number | null; // null = sem base de comparação (período anterior sem vendas)
}

export async function getRevenue(period: Period): Promise<Revenue> {
  const session = await getSession();
  const empty: Revenue = { totalCents: 0, count: 0, avgTicketCents: 0, byMonth: [], previousTotalCents: 0, variancePct: null };
  if (!session?.companyId) return empty;

  const supabase = await createClient();
  const prev = previousPeriodRange(period);
  const [{ data }, { data: prevData }] = await Promise.all([
    supabase
      .from("sales")
      .select("net_cents, total_cents, sold_at")
      .eq("company_id", session.companyId)
      .gte("sold_at", periodStart(period)),
    supabase
      .from("sales")
      .select("net_cents, total_cents")
      .eq("company_id", session.companyId)
      .gte("sold_at", prev.start)
      .lt("sold_at", prev.end),
  ]);

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

  const previousTotalCents = (prevData ?? []).reduce((s, r) => s + val(r), 0);
  const variancePct = previousTotalCents > 0 ? ((totalCents - previousTotalCents) / previousTotalCents) * 100 : null;

  return { totalCents, count, avgTicketCents, byMonth, previousTotalCents, variancePct };
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

// ---------- 5. PERFORMANCE POR VENDEDOR ----------
export interface SalespersonRow {
  salespersonId: string | null; // null = sem vendedor atribuído
  email: string;
  quotesCount: number;
  sentCount: number;
  wonCount: number;
  conversion: number; // %
  revenueCents: number;
}

const REACHED_CLIENT = ["sent", "viewed", "negotiation_requested", "approved", "rejected"];

export async function getSalesBySalesperson(period: Period): Promise<SalespersonRow[]> {
  const session = await getSession();
  if (!session?.companyId) return [];

  const supabase = await createClient();
  const start = periodStart(period);

  const [{ data: quotes }, { data: sales }, { members }] = await Promise.all([
    supabase
      .from("quotes")
      .select("salesperson_id, status")
      .eq("company_id", session.companyId)
      .is("deleted_at", null)
      .gte("created_at", start),
    supabase
      .from("sales")
      .select("net_cents, total_cents, quotes!inner(salesperson_id)")
      .eq("company_id", session.companyId)
      .gte("sold_at", start),
    getTeam(),
  ]);

  const emailMap = new Map(members.map((m) => [m.userId, m.email]));
  const NULL_KEY = "__null__";

  const map = new Map<
    string,
    { quotesCount: number; sentCount: number; wonCount: number; revenueCents: number }
  >();

  function bucket(id: string | null) {
    const k = id ?? NULL_KEY;
    if (!map.has(k)) map.set(k, { quotesCount: 0, sentCount: 0, wonCount: 0, revenueCents: 0 });
    return map.get(k)!;
  }

  for (const q of quotes ?? []) {
    const b = bucket((q as { salesperson_id?: string | null }).salesperson_id ?? null);
    b.quotesCount += 1;
    if (REACHED_CLIENT.includes(q.status)) b.sentCount += 1;
    if (q.status === "approved") b.wonCount += 1;
  }

  for (const s of sales ?? []) {
    const spId = ((s as { quotes?: { salesperson_id?: string | null } }).quotes?.salesperson_id) ?? null;
    const b = bucket(spId);
    const val = (s.net_cents ?? (s as { total_cents?: number }).total_cents ?? 0);
    b.revenueCents += val;
  }

  return Array.from(map.entries())
    .map(([k, v]) => {
      const id = k === NULL_KEY ? null : k;
      return {
        salespersonId: id,
        email: id ? (emailMap.get(id) ?? id.slice(0, 8) + "…") : "Sem vendedor atribuído",
        ...v,
        conversion: v.sentCount > 0 ? (v.wonCount / v.sentCount) * 100 : 0,
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents);
}
