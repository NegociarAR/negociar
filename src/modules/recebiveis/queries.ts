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
  customer_whatsapp: string | null;
  quote_number: number | null;
  asaas_invoice_url: string | null;
  customer_id?: string | null;
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

function periodBounds(period: string): { start: string; end: string } {
  const [y, m] = period.split("-").map(Number);
  const start = `${period}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${period}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

// Busca parcelas pendentes + recebidas recentes, com dados do cliente/venda.
export async function getReceivables({ period, customerId }: { period: string; customerId?: string } = { period: new Date().toISOString().slice(0, 7) }) {
  const session = await getSession();
  if (!session?.companyId)
    return { overdue: [], dueSoon: [], upcoming: [], received: [], asaasEnabled: false };

  const supabase = await createClient();
  const [{ data }, { data: asaas }] = await Promise.all([
    supabase
      .from("sale_installments")
      .select(
        "id, sale_id, number, due_date, amount_cents, status, received_at, asaas_invoice_url, sales(quote_id, customer_id, customers(person_type, name, trade_name, legal_name, whatsapp, phone), quotes(number))",
      )
      .eq("company_id", session.companyId)
      .order("due_date", { ascending: true }),
    supabase
      .from("company_asaas_client_settings")
      .select("enabled")
      .eq("company_id", session.companyId)
      .maybeSingle(),
  ]);

  const { start: periodStart, end: periodEnd } = periodBounds(period);

  const rows: Receivable[] = (data ?? []).map((r) => {
    const sale = (r as { sales?: unknown }).sales as {
      customer_id?: string | null;
      customers?: (Parameters<typeof customerName>[0] & { whatsapp?: string | null; phone?: string | null }) | null;
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
      customer_whatsapp: sale?.customers?.whatsapp ?? sale?.customers?.phone ?? null,
      quote_number: sale?.quotes?.number ?? null,
      asaas_invoice_url: r.asaas_invoice_url,
      customer_id: sale?.customer_id ?? null,
    };
  });

  const today = todayISO();
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7ISO = in7.toISOString().slice(0, 10);

  const byCustomer = (r: Receivable & { customer_id?: string | null }) =>
    !customerId || r.customer_id === customerId;

  const pending = rows.filter((r) => r.status === "pending" && byCustomer(r));

  return {
    // Vencidas: sempre todas, só filtra cliente
    overdue: pending.filter((r) => r.due_date < today),
    // dueSoon e upcoming: filtradas por período E 7 dias
    dueSoon: pending.filter((r) => r.due_date >= today && r.due_date <= in7ISO && r.due_date >= periodStart && r.due_date <= periodEnd),
    upcoming: pending.filter((r) => r.due_date > in7ISO && r.due_date >= periodStart && r.due_date <= periodEnd),
    // Recebidas: filtradas por período
    received: rows
      .filter((r) => r.status === "received" && byCustomer(r) && (r.received_at ?? "") >= periodStart && (r.received_at ?? "") <= periodEnd + "T23:59:59")
      .sort((a, b) => (b.received_at ?? "").localeCompare(a.received_at ?? ""))
      .slice(0, 20),
    asaasEnabled: Boolean(asaas?.enabled),
  };
}

// Totais para os cards do topo.
// toReceive e overdue: totais gerais, só filtram por customerId.
// receivedInPeriod: total recebido no período filtrado.
export async function receivableTotals({ period, customerId }: { period: string; customerId?: string } = { period: new Date().toISOString().slice(0, 7) }) {
  const session = await getSession();
  if (!session?.companyId)
    return { toReceive: 0, overdue: 0, receivedInPeriod: 0 };

  const supabase = await createClient();
  const today = todayISO();
  const { start: periodStart } = periodBounds(period);

  let pendingQ = supabase
    .from("sale_installments")
    .select("amount_cents, due_date, sales(customer_id)")
    .eq("company_id", session.companyId)
    .eq("status", "pending");

  let receivedQ = supabase
    .from("sale_installments")
    .select("amount_cents, received_at, sales(customer_id)")
    .eq("company_id", session.companyId)
    .eq("status", "received")
    .gte("received_at", periodStart);

  const [{ data: pending }, { data: received }] = await Promise.all([pendingQ, receivedQ]);

  const matchCustomer = (r: { sales?: unknown }) => {
    if (!customerId) return true;
    const sale = r.sales as { customer_id?: string | null } | null;
    return sale?.customer_id === customerId;
  };

  const filteredPending = (pending ?? []).filter(matchCustomer);
  const filteredReceived = (received ?? []).filter(matchCustomer);

  const toReceive = filteredPending.reduce((s, r) => s + r.amount_cents, 0);
  const overdue = filteredPending.filter((r) => r.due_date < today).reduce((s, r) => s + r.amount_cents, 0);
  const receivedInPeriod = filteredReceived.reduce((s, r) => s + r.amount_cents, 0);

  return { toReceive, overdue, receivedInPeriod };
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
