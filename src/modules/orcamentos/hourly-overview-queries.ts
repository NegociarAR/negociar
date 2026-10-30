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

  const { data: entries } = await supabase
    .from("quote_hour_entries")
    .select("quote_id, entry_date, hours, sale_id")
    .in("quote_id", ids);

  // Horas AINDA NÃO faturadas por (quote_id, período) — a fonte da verdade de
  // "pendente" é o sale_id da própria entrada, não bater período com fatura:
  // uma fatura pode agrupar horas de vários meses numa única sale.
  const pendingHoursByQuotePeriod = new Map<string, Map<string, number>>();
  const saleIdsByQuote = new Map<string, Set<string>>();
  for (const e of entries ?? []) {
    const period = (e.entry_date as string).slice(0, 7);
    if (e.sale_id) {
      if (!saleIdsByQuote.has(e.quote_id)) saleIdsByQuote.set(e.quote_id, new Set());
      saleIdsByQuote.get(e.quote_id)!.add(e.sale_id);
      continue; // já faturada: não entra em pendingHours, independente do período
    }
    if (!pendingHoursByQuotePeriod.has(e.quote_id)) pendingHoursByQuotePeriod.set(e.quote_id, new Map());
    const m = pendingHoursByQuotePeriod.get(e.quote_id)!;
    m.set(period, (m.get(period) ?? 0) + Number(e.hours));
  }

  const allSaleIds = Array.from(new Set(Array.from(saleIdsByQuote.values()).flatMap((s) => Array.from(s))));
  const { data: sales } = allSaleIds.length
    ? await supabase
        .from("sales")
        .select("id, quote_id, reference_period, total_cents, sold_at, sale_installments(status, due_date)")
        .in("id", allSaleIds)
    : { data: [] as never[] };

  type SaleRow = {
    id: string;
    quote_id: string;
    reference_period: string | null;
    total_cents: number;
    sold_at: string;
    sale_installments?: { status: string; due_date: string }[];
  };
  const salesByQuote = new Map<string, { totalCents: number; status: string; dueDate: string; period: string | null; soldAt: string }[]>();
  for (const s of (sales ?? []) as SaleRow[]) {
    const inst = s.sale_installments?.[0];
    const status = inst ? (inst.status === "pending" && inst.due_date < today ? "overdue" : inst.status) : "pending";
    if (!salesByQuote.has(s.quote_id)) salesByQuote.set(s.quote_id, []);
    salesByQuote.get(s.quote_id)!.push({
      totalCents: s.total_cents,
      status,
      dueDate: inst?.due_date ?? "",
      period: s.reference_period,
      soldAt: s.sold_at,
    });
  }

  const contracts: HourlyContractOverview[] = quotes.map((q) => {
    const rate = q.hourly_rate_cents ?? 0;
    const hoursMap = pendingHoursByQuotePeriod.get(q.id) ?? new Map();
    const invoices = salesByQuote.get(q.id) ?? [];

    const pendingMonths: PendingMonth[] = [];
    let currentMonthHours = 0;
    for (const [period, hours] of hoursMap) {
      if (period === thisMonth) {
        currentMonthHours = hours;
        continue; // mês em andamento não é "pendência"
      }
      if (period > thisMonth) continue; // lançamento futuro (raro, não conta)
      pendingMonths.push({ period, hours, estimatedCents: Math.round(hours * rate) });
    }
    pendingMonths.sort((a, b) => a.period.localeCompare(b.period));

    // última fatura emitida (mais recente) e sua situação
    const sortedInvoices = [...invoices].sort((a, b) => b.soldAt.localeCompare(a.soldAt));
    const last = sortedInvoices[0] ?? null;
    const overdueInvoicesCount = invoices.filter((v) => v.status === "overdue").length;
    const anyInvoicePending = invoices.some((v) => v.status === "pending");

    const situation: HourlyContractOverview["situation"] =
      pendingMonths.length > 0 ? "pending_invoice" : overdueInvoicesCount > 0 ? "overdue" : anyInvoicePending ? "invoice_pending" : "ok";

    return {
      quoteId: q.id,
      quoteNumber: q.number,
      customerName: customerName((q as { customers?: unknown }).customers as Parameters<typeof customerName>[0]),
      rateCents: rate,
      currentMonthHours,
      pendingMonths,
      lastInvoicePeriod: last?.period ?? null,
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
