import { createClient } from "@/lib/supabase/server";

export interface TrendPoint {
  month: string; // YYYY-MM
  cents: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  totalCents: number;
}

export const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export function monthLabel(ym: string): string {
  const m = Number(ym.slice(5, 7));
  return MONTH_NAMES[m - 1];
}

// Vendas dos últimos 6 meses (incluindo o corrente), com meses sem venda
// aparecendo como zero — para a tendência não "pular" no gráfico.
export async function getSalesTrend(companyId: string): Promise<TrendPoint[]> {
  const supabase = await createClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { data } = await supabase
    .from("sales")
    .select("total_cents, sold_at")
    .eq("company_id", companyId)
    .eq("status", "won")
    .gte("sold_at", start.toISOString());

  const map = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    map.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const r of data ?? []) {
    const key = (r.sold_at as string).slice(0, 7);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + r.total_cents);
  }
  return Array.from(map, ([month, cents]) => ({ month, cents }));
}

// Faturamento do mês corrente comparado ao mês anterior.
export async function getRevenueVariance(companyId: string): Promise<{ currentCents: number; variancePct: number | null }> {
  const supabase = await createClient();
  const now = new Date();
  const curStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const [{ data: cur }, { data: prev }] = await Promise.all([
    supabase.from("sales").select("total_cents").eq("company_id", companyId).eq("status", "won").gte("sold_at", curStart),
    supabase.from("sales").select("total_cents").eq("company_id", companyId).eq("status", "won").gte("sold_at", prevStart).lt("sold_at", curStart),
  ]);

  const currentCents = (cur ?? []).reduce((s, r) => s + r.total_cents, 0);
  const prevCents = (prev ?? []).reduce((s, r) => s + r.total_cents, 0);
  const variancePct = prevCents > 0 ? ((currentCents - prevCents) / prevCents) * 100 : null;
  return { currentCents, variancePct };
}

// Os 3 clientes que mais compraram nos últimos 90 dias — "onde estou
// ganhando dinheiro de verdade", não só quantidade de cadastro.
export async function getTopCustomers(companyId: string): Promise<TopCustomer[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 90 * 86400000).toISOString();

  const { data } = await supabase
    .from("sales")
    .select("total_cents, customer_id, customers(name, trade_name, legal_name, person_type)")
    .eq("company_id", companyId)
    .eq("status", "won")
    .gte("sold_at", since);

  const map = new Map<string, { name: string; total: number }>();
  for (const r of data ?? []) {
    const c = (r as { customers?: { name?: string | null; trade_name?: string | null; legal_name?: string | null; person_type?: string } }).customers;
    const name = (c ? (c.person_type === "pf" ? c.name : (c.trade_name ?? c.legal_name)) : null) ?? "Cliente";
    const cur = map.get(r.customer_id) ?? { name, total: 0 };
    cur.total += r.total_cents;
    map.set(r.customer_id, cur);
  }
  return Array.from(map, ([id, v]) => ({ id, name: v.name, totalCents: v.total }))
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 3);
}
