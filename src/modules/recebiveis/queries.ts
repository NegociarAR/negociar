import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

export interface Receivable {
  id: string;
  sale_id: string;
  number: number; // 0 = entrada
  due_date: string;
  amount_cents: number;
  status: "pending" | "received" | "overdue" | "canceled";
  received_at: string | null;
  customer_name: string | null;
  quote_number: number | null;
}

function customerName(c: {
  person_type?: string;
  name?: string | null;
  trade_name?: string | null;
  legal_name?: string | null;
} | null): string | null {
  if (!c) return null;
  if (c.person_type === "pf") return c.name ?? null;
  return c.trade_name ?? c.legal_name ?? null;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Busca parcelas pendentes + recebidas recentes, com dados do cliente/venda.
export async function getReceivables() {
  const session = await getSession();
  if (!session?.companyId)
    return { overdue: [], dueSoon: [], upcoming: [], received: [] };

  const supabase = await createClient();
  const { data } = await supabase
    .from("sale_installments")
    .select(
      "id, sale_id, number, due_date, amount_cents, status, received_at, sales(quote_id, customers(person_type, name, trade_name, legal_name), quotes(number))",
    )
    .eq("company_id", session.companyId)
    .order("due_date", { ascending: true });

  const rows: Receivable[] = (data ?? []).map((r) => {
    const sale = (r as { sales?: unknown }).sales as {
      customers?: Parameters<typeof customerName>[0];
      quotes?: { number?: number } | null;
    } | null;
    return {
      id: r.id,
      sale_id: r.sale_id,
      number: r.number,
      due_date: r.due_date,
      amount_cents: r.amount_cents,
      status: r.status,
      received_at: r.received_at,
      customer_name: customerName(sale?.customers ?? null),
      quote_number: sale?.quotes?.number ?? null,
    };
  });

  const today = todayISO();
  // janela "vence em breve" = próximos 7 dias
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7ISO = in7.toISOString().slice(0, 10);

  const pending = rows.filter((r) => r.status === "pending");

  return {
    overdue: pending.filter((r) => r.due_date < today),
    dueSoon: pending.filter((r) => r.due_date >= today && r.due_date <= in7ISO),
    upcoming: pending.filter((r) => r.due_date > in7ISO),
    received: rows
      .filter((r) => r.status === "received")
      .sort((a, b) => (b.received_at ?? "").localeCompare(a.received_at ?? ""))
      .slice(0, 20),
  };
}

// Totais para os cards do topo.
export async function receivableTotals() {
  const session = await getSession();
  if (!session?.companyId)
    return { toReceive: 0, overdue: 0, receivedThisMonth: 0 };

  const supabase = await createClient();
  const today = todayISO();
  const monthStart = today.slice(0, 7) + "-01";

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
    .gte("received_at", monthStart);

  const toReceive =
    pending?.reduce((s, r) => s + r.amount_cents, 0) ?? 0;
  const overdue =
    pending
      ?.filter((r) => r.due_date < today)
      .reduce((s, r) => s + r.amount_cents, 0) ?? 0;
  const receivedThisMonth =
    received?.reduce((s, r) => s + r.amount_cents, 0) ?? 0;

  return { toReceive, overdue, receivedThisMonth };
}

// Contagem de parcelas vencidas (para o badge da nav).
export async function overdueCount(): Promise<number> {
  const session = await getSession();
  if (!session?.companyId) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("sale_installments")
    .select("id", { count: "exact", head: true })
    .eq("company_id", session.companyId)
    .eq("status", "pending")
    .lt("due_date", todayISO());
  return count ?? 0;
}
