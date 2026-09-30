import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { currentPeriod, todayBRT } from "@/lib/period";
import type { HourlyContractOverview, HourlyOverview, PendingMonth } from "./hourly-overview-types";

function customerName(c: {
  person_type?: string;
  name?: string | null;
  trade_name?: string | null;
  legal_name?: string | null;
} | null): string {
  if (!c) return "Cliente";
  return (c.person_type === "pf" ? c.name : (c.trade_name ?? c.legal_name)) ?? "Cliente";
}

// Visão consolidada de todos os contratos por hora aprovados da empresa:
// meses fechados com horas lançadas mas ainda sem fatura, faturas emitidas
// aguardando recebimento e faturas vencidas. É o "onde eu deixei passar
// algo" que hoje só dava pra ver entrando orçamento por orçamento.
export async function getHourlyOverview(): Promise<HourlyOverview> {
  const empty: HourlyOverview = {
    contracts: [],
    totals: { pendingInvoiceCount: 0, pendingInvoiceCents: 0, overdueCount: 0, invoicePendingCount: 0 },
  };
  const session = await getSession();
  if (!session?.companyId) return empty;

  const supabase = await createClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, number, hourly_rate_cents, customers(person_type, name, trade_name, legal_name)")
    .eq("company_id", session.companyId)
    .eq("is_hourly_contract", true)
    .eq("status", "approved")
    .is("deleted_at", null);

  if (!quotes || quotes.length === 0) return empty;
  const ids = quotes.map((q) => q.id);
  const today = todayBRT();
  const thisMonth = currentPeriod();

  const [entriesRes, salesRes] = await Promise.all([
    supabase.from("quote_hour_entries").select("quote_id, entry_date, hours").in("quote_id", ids),
    supabase
      .from("sales")
      .select("quote_id, reference_period, total_cents, sale_installments(status, due_date)")
      .in("quote_id", ids)
      .not("reference_period", "is", null),
  ]);

  // horas por (quote_id, período)
  const hoursByQuotePeriod = new Map<string, Map<string, number>>();
  for (const e of entriesRes.data ?? []) {
    const period = (e.entry_date as string).slice(0, 7);
    if (!hoursByQuotePeriod.has(e.quote_id)) hoursByQuotePeriod.set(e.quote_id, new Map());
    const m = hoursByQuotePeriod.get(e.quote_id)!;
    m.set(period, (m.get(period) ?? 0) + Number(e.hours));
  }

  // faturas por (quote_id, período) + situação da parcela
  type SaleRow = { quote_id: string; reference_period: string; total_cents: number; sale_installments?: { status: string; due_date: string }[] };
  const invoicesByQuote = new Map<string, Map<string, { totalCents: number; status: string; dueDate: string }>>();
  for (const s of (salesRes.data ?? []) as SaleRow[]) {
    const inst = s.sale_installments?.[0];
    const status = inst ? (inst.status === "pending" && inst.due_date < today ? "overdue" : inst.status) : "pending";
    if (!invoicesByQuote.has(s.quote_id)) invoicesByQuote.set(s.quote_id, new Map());
    invoicesByQuote.get(s.quote_id)!.set(s.reference_period, {
      totalCents: s.total_cents,
      status,
      dueDate: inst?.due_date ?? "",
    });
  }

  const contracts: HourlyContractOverview[] = quotes.map((q) => {
    const rate = q.hourly_rate_cents ?? 0;
    const hoursMap = hoursByQuotePeriod.get(q.id) ?? new Map();
    const invMap = invoicesByQuote.get(q.id) ?? new Map();

    const pendingMonths: PendingMonth[] = [];
    let currentMonthHours = 0;
    for (const [period, hours] of hoursMap) {
      if (period === thisMonth) {
        currentMonthHours = hours;
        continue; // mês em andamento não é "pendência"
      }
      if (period > thisMonth) continue; // lançamento futuro (raro, não conta)
      if (!invMap.has(period)) {
        pendingMonths.push({ period, hours, estimatedCents: Math.round(hours * rate) });
      }
    }
    pendingMonths.sort((a, b) => a.period.localeCompare(b.period));

    // última fatura emitida (mais recente) e sua situação
    const invoicedPeriods = Array.from(invMap.keys()).sort().reverse();
    const lastPeriod = invoicedPeriods[0] ?? null;
    const last = lastPeriod ? invMap.get(lastPeriod)! : null;
    const overdueInvoicesCount = Array.from(invMap.values()).filter((v) => v.status === "overdue").length;
    const anyInvoicePending = Array.from(invMap.values()).some((v) => v.status === "pending");

    const situation: HourlyContractOverview["situation"] =
      pendingMonths.length > 0 ? "pending_invoice" : overdueInvoicesCount > 0 ? "overdue" : anyInvoicePending ? "invoice_pending" : "ok";

    return {
      quoteId: q.id,
      quoteNumber: q.number,
      customerName: customerName((q as { customers?: unknown }).customers as Parameters<typeof customerName>[0]),
      rateCents: rate,
      currentMonthHours,
      pendingMonths,
      lastInvoicePeriod: lastPeriod,
      lastInvoiceCents: last?.totalCents ?? null,
      lastInvoiceStatus: (last?.status as HourlyContractOverview["lastInvoiceStatus"]) ?? null,
      overdueInvoicesCount,
      situation,
    };
  });

  const order: Record<HourlyContractOverview["situation"], number> = { pending_invoice: 0, overdue: 1, invoice_pending: 2, ok: 3 };
  contracts.sort((a, b) => order[a.situation] - order[b.situation] || b.pendingMonths.length - a.pendingMonths.length);

  return {
    contracts,
    totals: {
      pendingInvoiceCount: contracts.filter((c) => c.pendingMonths.length > 0).length,
      pendingInvoiceCents: contracts.reduce((s, c) => s + c.pendingMonths.reduce((x, m) => x + m.estimatedCents, 0), 0),
      overdueCount: contracts.filter((c) => c.overdueInvoicesCount > 0).length,
      invoicePendingCount: contracts.filter((c) => c.situation === "invoice_pending").length,
    },
  };
}
