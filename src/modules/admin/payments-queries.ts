import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "./queries";
import { METHOD_LABELS, type PaymentRow, type MethodTotal } from "./payments-types";

export type { PaymentRow, MethodTotal };
export { METHOD_LABELS };

export interface PaymentsReport {
  setupNeeded: boolean;
  month: string; // YYYY-MM ou "all"
  totalCents: number;
  totalCount: number;
  byMethod: MethodTotal[];
  rows: PaymentRow[];
}

// Histórico de recebimentos (títulos pagos), agrupado por forma de pagamento.
// month = "YYYY-MM" filtra pela data do PAGAMENTO (paid_at); "all" traz tudo.
export async function getPaymentsReport(month: string): Promise<PaymentsReport> {
  const empty: PaymentsReport = { setupNeeded: true, month, totalCents: 0, totalCount: 0, byMethod: [], rows: [] };
  if (!(await requireAdmin())) return empty;

  const supabase = await createClient();
  let q = supabase
    .from("billing_invoices")
    .select("id, company_id, reference_period, description, amount_cents, paid_amount_cents, payment_method, paid_at, due_date, companies(name)")
    .eq("status", "paid")
    .order("paid_at", { ascending: false });

  if (month !== "all") {
    const start = `${month}-01T00:00:00-03:00`;
    const [y, m] = month.split("-").map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    const end = `${nextMonth}-01T00:00:00-03:00`;
    q = q.gte("paid_at", start).lt("paid_at", end);
  }

  const { data, error } = await q.limit(1000);
  if (error) return { ...empty, setupNeeded: true };

  const rows: PaymentRow[] = (data ?? []).map((r) => ({
    id: r.id,
    company_id: r.company_id,
    company_name: (r as { companies?: { name?: string } }).companies?.name ?? "—",
    reference_period: r.reference_period,
    description: r.description,
    amount_cents: r.amount_cents,
    paid_amount_cents: r.paid_amount_cents ?? r.amount_cents,
    payment_method: r.payment_method,
    paid_at: r.paid_at as string,
    due_date: r.due_date,
  }));

  const map = new Map<string, MethodTotal>();
  for (const r of rows) {
    const key = r.payment_method ?? "outro";
    const cur = map.get(key) ?? { method: key, label: METHOD_LABELS[key] ?? key, count: 0, cents: 0 };
    cur.count += 1;
    cur.cents += r.paid_amount_cents;
    map.set(key, cur);
  }
  const byMethod = Array.from(map.values()).sort((a, b) => b.cents - a.cents);

  return {
    setupNeeded: false,
    month,
    totalCents: rows.reduce((s, r) => s + r.paid_amount_cents, 0),
    totalCount: rows.length,
    byMethod,
    rows,
  };
}

// Últimos meses com pelo menos um pagamento (para o seletor).
export async function listPaymentMonths(): Promise<string[]> {
  if (!(await requireAdmin())) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("billing_invoices")
    .select("paid_at")
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(500);
  const months = new Set<string>();
  for (const r of data ?? []) {
    if (r.paid_at) months.add((r.paid_at as string).slice(0, 7));
  }
  return Array.from(months).sort().reverse();
}
