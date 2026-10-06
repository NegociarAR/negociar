import { createClient } from "@/lib/supabase/server";
import { currentPeriod, todayBRT } from "@/lib/period";
import { diffDays } from "@/lib/dates";
import { requireAdmin } from "./queries";

export type InvoiceState = "open" | "overdue" | "paid" | "canceled";
export type Situation = "ok" | "tolerance" | "eligible" | "blocked";

export interface Invoice {
  id: string;
  company_id: string;
  company_name: string;
  reference_period: string;
  description: string | null;
  amount_cents: number;
  due_date: string;
  status: "open" | "paid" | "canceled";
  paid_at: string | null;
  paid_amount_cents: number | null;
  payment_method: string | null;
  overdue_days: number;
  state: InvoiceState;
  asaas_invoice_url: string | null;
}

export interface CompanyAccess {
  companyId: string;
  name: string;
  status: string;
  suspendedReason: string | null;
  planName: string | null;
  periodEnd: string | null;
  overdueCount: number;
  overdueCents: number;
  maxOverdueDays: number;
  situation: Situation;
}

export interface BillingOverview {
  setupNeeded: boolean;
  month: string;
  today: string;
  graceDays: number;
  paymentInstructions: string | null;
  metrics: {
    mrr: number;
    payingCompanies: number;
    invoicedMonth: number;
    receivedMonth: number;
    openCents: number;
    openCount: number;
    overdueCents: number;
    overdueCount: number;
    overdueCompanies: number;
    delinquencyPct: number;
  };
  aging: { label: string; cents: number; count: number }[];
  invoices: Invoice[];
  access: CompanyAccess[];
  companies: { id: string; name: string }[];
  exemptCount: number;
}

const BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "1 a 5 dias", min: 1, max: 5 },
  { label: "6 a 15 dias", min: 6, max: 15 },
  { label: "16 a 30 dias", min: 16, max: 30 },
  { label: "Mais de 30 dias", min: 31, max: 99999 },
];

// Visão financeira da plataforma (mensalidades das empresas clientes). Só admin.
export async function getBillingOverview(): Promise<BillingOverview | null> {
  if (!(await requireAdmin())) return null;
  const supabase = await createClient();
  const today = todayBRT();
  const month = currentPeriod();

  const [inv, comp, set] = await Promise.all([
    supabase
      .from("billing_invoices")
      .select("id, company_id, reference_period, description, amount_cents, due_date, status, paid_at, paid_amount_cents, payment_method, asaas_invoice_url, companies(name, billing_exempt)")
      .order("due_date", { ascending: false })
      .limit(2000),
    supabase
      .from("companies")
      .select("id, name, status, suspended_reason, billing_exempt, subscriptions(status, current_period_end, plans(name, price_cents))")
      .order("name"),
    supabase.from("platform_settings").select("grace_days, payment_instructions").maybeSingle(),
  ]);

  const graceDays = set.data?.grace_days ?? 5;
  const empty: BillingOverview = {
    setupNeeded: Boolean(inv.error),
    month, today, graceDays,
    paymentInstructions: set.data?.payment_instructions ?? null,
    metrics: { mrr: 0, payingCompanies: 0, invoicedMonth: 0, receivedMonth: 0, openCents: 0, openCount: 0, overdueCents: 0, overdueCount: 0, overdueCompanies: 0, delinquencyPct: 0 },
    aging: BUCKETS.map((b) => ({ label: b.label, cents: 0, count: 0 })),
    invoices: [], access: [], companies: [], exemptCount: 0,
  };
  if (inv.error || comp.error) return { ...empty, setupNeeded: true };

  const invoices: Invoice[] = (inv.data ?? [])
    .filter((r) => !(r as { companies?: { billing_exempt?: boolean } }).companies?.billing_exempt)
    .map((r) => {
    const status = r.status as Invoice["status"];
    const overdue = status === "open" && r.due_date < today;
    return {
      id: r.id,
      company_id: r.company_id,
      company_name: (r as { companies?: { name?: string } }).companies?.name ?? "—",
      reference_period: r.reference_period,
      description: r.description,
      amount_cents: r.amount_cents,
      due_date: r.due_date,
      status,
      paid_at: r.paid_at,
      paid_amount_cents: r.paid_amount_cents,
      payment_method: r.payment_method,
      overdue_days: overdue ? diffDays(today, r.due_date) : 0,
      state: overdue ? "overdue" : status === "open" ? "open" : status,
      asaas_invoice_url: r.asaas_invoice_url,
    };
  });

  // ---- métricas ----
  const sum = (xs: Invoice[], f: (i: Invoice) => number) => xs.reduce((s, i) => s + f(i), 0);
  const overdue = invoices.filter((i) => i.state === "overdue");
  const open = invoices.filter((i) => i.state === "open");
  const paidMonth = invoices.filter(
    (i) => i.status === "paid" && i.paid_at &&
      new Date(i.paid_at).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7) === month,
  );
  const dueSoFar = invoices.filter((i) => i.status !== "canceled" && i.due_date <= today);
  const base = sum(dueSoFar, (i) => i.amount_cents);

  type CompRow = {
    id: string; name: string; status: string; suspended_reason: string | null; billing_exempt: boolean | null;
    subscriptions: { status: string; current_period_end: string | null; plans: { name: string; price_cents: number } | null }[];
  };
  const allCompanies = (comp.data ?? []) as unknown as CompRow[];
  const exemptCount = allCompanies.filter((c) => c.billing_exempt).length;
  const companies = allCompanies.filter((c) => !c.billing_exempt);

  let mrr = 0;
  let paying = 0;
  const access: CompanyAccess[] = [];
  for (const c of companies) {
    if (c.status === "pending") continue;
    const sub = c.subscriptions?.find((s) => s.status === "active") ?? c.subscriptions?.find((s) => s.status === "trialing");
    if (c.status === "active" && sub?.status === "active" && (sub.plans?.price_cents ?? 0) > 0) {
      mrr += sub.plans!.price_cents;
      paying += 1;
    }
    const mine = overdue.filter((i) => i.company_id === c.id);
    const maxDays = mine.reduce((m, i) => Math.max(m, i.overdue_days), 0);
    const situation: Situation =
      c.status === "suspended" ? "blocked" : maxDays > graceDays ? "eligible" : mine.length ? "tolerance" : "ok";
    access.push({
      companyId: c.id, name: c.name, status: c.status, suspendedReason: c.suspended_reason,
      planName: sub?.plans?.name ?? null, periodEnd: sub?.current_period_end ?? null,
      overdueCount: mine.length, overdueCents: sum(mine, (i) => i.amount_cents), maxOverdueDays: maxDays, situation,
    });
  }
  const order: Record<Situation, number> = { eligible: 0, tolerance: 1, blocked: 2, ok: 3 };
  access.sort((a, b) => order[a.situation] - order[b.situation] || b.maxOverdueDays - a.maxOverdueDays);

  return {
    setupNeeded: false,
    month, today, graceDays,
    paymentInstructions: set.data?.payment_instructions ?? null,
    metrics: {
      mrr, payingCompanies: paying,
      invoicedMonth: sum(invoices.filter((i) => i.reference_period === month && i.status !== "canceled"), (i) => i.amount_cents),
      receivedMonth: sum(paidMonth, (i) => i.paid_amount_cents ?? i.amount_cents),
      openCents: sum(open, (i) => i.amount_cents), openCount: open.length,
      overdueCents: sum(overdue, (i) => i.amount_cents), overdueCount: overdue.length,
      overdueCompanies: new Set(overdue.map((i) => i.company_id)).size,
      delinquencyPct: base > 0 ? (sum(overdue, (i) => i.amount_cents) / base) * 100 : 0,
    },
    aging: BUCKETS.map((b) => {
      const xs = overdue.filter((i) => i.overdue_days >= b.min && i.overdue_days <= b.max);
      return { label: b.label, cents: sum(xs, (i) => i.amount_cents), count: xs.length };
    }),
    invoices,
    access,
    companies: companies.filter((c) => c.status !== "pending").map((c) => ({ id: c.id, name: c.name })),
    exemptCount,
  };
}