import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

export interface Followup {
  id: string;
  customer_id: string;
  quote_id: string | null;
  due_date: string; // YYYY-MM-DD
  reason: string | null;
  notes: string | null;
  status: "pending" | "done" | "canceled";
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

// Todos os follow-ups pendentes, agrupados por atraso.
export async function getFollowups() {
  const session = await getSession();
  if (!session?.companyId)
    return { overdue: [], today: [], upcoming: [], done: [] };

  const supabase = await createClient();
  const { data } = await supabase
    .from("followups")
    .select(
      "id, customer_id, quote_id, due_date, reason, notes, status, customers(person_type, name, trade_name, legal_name), quotes(number)",
    )
    .eq("company_id", session.companyId)
    .order("due_date", { ascending: true });

  const rows = (data ?? []).map((f) => {
    const c = (f as { customers?: unknown }).customers as Parameters<
      typeof customerName
    >[0];
    const q = (f as { quotes?: { number?: number } | null }).quotes;
    return {
      id: f.id,
      customer_id: f.customer_id,
      quote_id: f.quote_id,
      due_date: f.due_date,
      reason: f.reason,
      notes: f.notes,
      status: f.status,
      customer_name: customerName(c),
      quote_number: q?.number ?? null,
    } as Followup;
  });

  const today = todayISO();
  const pending = rows.filter((f) => f.status === "pending");

  return {
    overdue: pending.filter((f) => f.due_date < today),
    today: pending.filter((f) => f.due_date === today),
    upcoming: pending.filter((f) => f.due_date > today),
    done: rows.filter((f) => f.status === "done").slice(0, 20),
  };
}

// Contadores para o dashboard.
export async function followupCounts() {
  const session = await getSession();
  if (!session?.companyId) return { today: 0, overdue: 0 };
  const supabase = await createClient();
  const today = todayISO();

  const [overdue, dueToday] = await Promise.all([
    supabase
      .from("followups")
      .select("id", { count: "exact", head: true })
      .eq("company_id", session.companyId)
      .eq("status", "pending")
      .lt("due_date", today),
    supabase
      .from("followups")
      .select("id", { count: "exact", head: true })
      .eq("company_id", session.companyId)
      .eq("status", "pending")
      .eq("due_date", today),
  ]);

  return { today: dueToday.count ?? 0, overdue: overdue.count ?? 0 };
}

// Clientes para o seletor do formulário de follow-up.
export async function customersForFollowup() {
  const session = await getSession();
  if (!session?.companyId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, person_type, name, trade_name, legal_name")
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .neq("status", "blocked")
    .order("created_at", { ascending: false });
  return (data ?? []).map((c) => ({
    id: c.id,
    name: customerName(c) ?? "Sem nome",
  }));
}
