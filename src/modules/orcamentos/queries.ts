import { currentPeriod } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

export type { QuoteStatus, QuoteListRow, QuoteItem, QuoteDetail } from "./types";
export { STATUS_LABELS } from "./types";
import type { QuoteStatus, QuoteListRow, QuoteItem, QuoteDetail } from "./types";

function displayName(c: {
  person_type?: string;
  name?: string | null;
  trade_name?: string | null;
  legal_name?: string | null;
} | null): string | null {
  if (!c) return null;
  if (c.person_type === "pf") return c.name ?? null;
  return c.trade_name ?? c.legal_name ?? null;
}

export type QuoteStatusGroup = "todos" | "abertos" | "aprovados" | "recusados" | "rascunhos";

const GROUP_STATUSES: Record<QuoteStatusGroup, string[] | null> = {
  todos: null,
  abertos: ["sent", "viewed", "negotiation", "negotiation_requested"],
  aprovados: ["approved"],
  recusados: ["rejected", "canceled"],
  rascunhos: ["draft"],
};

export async function listQuotes(search?: string, group?: QuoteStatusGroup) {
  const session = await getSession();
  if (!session?.companyId) return [] as QuoteListRow[];
  const supabase = await createClient();

  let query = supabase
    .from("quotes")
    .select(
      "id, number, status, version, total_cents, created_at, valid_until, customer_id, customers(person_type, name, trade_name, legal_name)",
    )
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .neq("status", "superseded")
    .order("created_at", { ascending: false });

  const statuses = group ? GROUP_STATUSES[group] : null;
  if (statuses) query = query.in("status", statuses);

  const { data } = await query;
  let rows = (data ?? []).map((q) => {
    const c = (q as { customers?: unknown }).customers as Parameters<
      typeof displayName
    >[0];
    return {
      id: q.id,
      number: q.number,
      status: q.status,
      version: q.version ?? 1,
      total_cents: q.total_cents,
      created_at: q.created_at,
      valid_until: (q as { valid_until?: string | null }).valid_until ?? null,
      customer_id: (q as { customer_id?: string | null }).customer_id ?? null,
      customer_name: displayName(c),
    } as QuoteListRow;
  });

  if (search?.trim()) {
    const s = search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.customer_name?.toLowerCase().includes(s) ||
        String(r.number).includes(s),
    );
  }
  return rows;
}

export async function countQuotesByGroup(): Promise<Record<QuoteStatusGroup, number>> {
  const session = await getSession();
  if (!session?.companyId) return { todos: 0, abertos: 0, aprovados: 0, recusados: 0, rascunhos: 0 };
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select("status")
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .neq("status", "superseded");

  const counts: Record<QuoteStatusGroup, number> = { todos: 0, abertos: 0, aprovados: 0, recusados: 0, rascunhos: 0 };
  for (const row of data ?? []) {
    counts.todos++;
    if (["sent", "viewed", "negotiation", "negotiation_requested"].includes(row.status)) counts.abertos++;
    else if (row.status === "approved") counts.aprovados++;
    else if (["rejected", "canceled"].includes(row.status)) counts.recusados++;
    else if (row.status === "draft") counts.rascunhos++;
  }
  return counts;
}

export async function getQuote(id: string): Promise<QuoteDetail | null> {
  const session = await getSession();
  if (!session?.companyId) return null;
  const supabase = await createClient();

  const { data: q } = await supabase
    .from("quotes")
    .select(
      "*, customers(person_type, name, trade_name, legal_name, whatsapp, phone, email)",
    )
    .eq("id", id)
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!q) return null;

  const { data: items } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", id)
    .order("sort_order");

  const c = (q as { customers?: unknown }).customers as Parameters<
    typeof displayName
  >[0];

  return {
    id: q.id,
    number: q.number,
    status: q.status,
    customer_id: q.customer_id,
    customer_name: displayName(c),
    customer_whatsapp:
      (c as { whatsapp?: string | null; phone?: string | null })?.whatsapp ??
      (c as { phone?: string | null })?.phone ??
      null,
    customer_email: (c as { email?: string | null })?.email ?? null,
    subtotal_cents: q.subtotal_cents,
    discount_cents: q.discount_cents,
    total_cents: q.total_cents,
    valid_until: q.valid_until,
    payment_terms: q.payment_terms,
    delivery_terms: q.delivery_terms,
    notes: q.notes,
    decision_reason: q.decision_reason ?? null,
    version: q.version ?? 1,
    is_hourly_contract: q.is_hourly_contract ?? false,
    hourly_rate_cents: q.hourly_rate_cents ?? null,
    decided_at: q.decided_at ?? null,
    public_token: q.public_token,
    created_at: q.created_at,
    salesperson_id: (q as { salesperson_id?: string | null }).salesperson_id ?? null,
    items: (items ?? []) as QuoteItem[],
  };
}

export async function getPendingFollowupQuoteIds(): Promise<Set<string>> {
  const session = await getSession();
  if (!session?.companyId) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("followups")
    .select("quote_id")
    .eq("company_id", session.companyId)
    .eq("status", "pending")
    .not("quote_id", "is", null);
  return new Set((data ?? []).map((r) => r.quote_id as string));
}

export async function getQuoteViewedAt(quoteId: string): Promise<string | null> {
  const session = await getSession();
  if (!session?.companyId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("quote_status_history")
    .select("changed_at")
    .eq("quote_id", quoteId)
    .eq("company_id", session.companyId)
    .eq("status", "viewed")
    .order("changed_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.changed_at ?? null;
}

// contagem de orçamentos criados no mês corrente (gate de limite)
export async function countQuotesThisMonth(): Promise<number> {
  const session = await getSession();
  if (!session?.companyId) return 0;
  const supabase = await createClient();
  const period = currentPeriod(); // 'YYYY-MM'
  const { data } = await supabase
    .from("usage_counters")
    .select("count")
    .eq("company_id", session.companyId)
    .eq("metric", "quotes_created")
    .eq("period", period)
    .maybeSingle();
  return data?.count ?? 0;
}

// opções para o construtor (clientes e produtos da empresa)
export async function quoteFormOptions() {
  const session = await getSession();
  if (!session?.companyId) return { customers: [], products: [] };
  const supabase = await createClient();

  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, person_type, name, trade_name, legal_name, status")
      .eq("company_id", session.companyId)
      .is("deleted_at", null)
      .neq("status", "blocked")
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select("id, name, current_price_cents, cost_cents")
      .eq("is_active", true)
      .eq("company_id", session.companyId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  return {
    customers: (customers ?? []).map((c) => ({
      id: c.id,
      label:
        c.person_type === "pf"
          ? (c.name ?? "Sem nome")
          : (c.trade_name ?? c.legal_name ?? "Sem nome"),
      status: (c as { status?: string }).status ?? "active",
    })),
    products: (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      current_price_cents: p.current_price_cents,
      cost_cents: p.cost_cents,
    })),
  };
}

// Orçamentos "abertos" (enviado/visualizado/negociação) para o badge da nav.
export async function countOpenQuotes(): Promise<number> {
  const session = await getSession();
  if (!session?.companyId) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .in("status", ["sent", "viewed", "negotiation"]);
  return count ?? 0;
}
