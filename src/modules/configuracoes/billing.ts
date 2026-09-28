import { createClient } from "@/lib/supabase/server";
import { todayBRT } from "@/lib/period";
import { addDays, diffDays } from "@/lib/dates";

export interface MyInvoice {
  id: string;
  reference_period: string;
  description: string | null;
  amount_cents: number;
  due_date: string;
  paid_at: string | null;
  state: "open" | "overdue" | "paid";
  overdue_days: number;
}

export interface MyBilling {
  invoices: MyInvoice[];
  alert: { count: number; cents: number; oldestDue: string; regularizeUntil: string; pastGrace: boolean } | null;
  instructions: string | null;
}

// Faturas da própria empresa (o RLS restringe ao tenant). Tolerante à ausência das tabelas.
export async function myBilling(companyId: string): Promise<MyBilling> {
  const supabase = await createClient();
  const today = todayBRT();
  const [inv, set] = await Promise.all([
    supabase
      .from("billing_invoices")
      .select("id, reference_period, description, amount_cents, due_date, status, paid_at")
      .eq("company_id", companyId)
      .neq("status", "canceled")
      .order("due_date", { ascending: false })
      .limit(24),
    supabase.from("platform_settings").select("grace_days, payment_instructions").maybeSingle(),
  ]);

  const grace = set.data?.grace_days ?? 5;
  const all: MyInvoice[] = (inv.data ?? []).map((r) => {
    const overdue = r.status === "open" && r.due_date < today;
    return {
      id: r.id,
      reference_period: r.reference_period,
      description: r.description,
      amount_cents: r.amount_cents,
      due_date: r.due_date,
      paid_at: r.paid_at,
      state: r.status === "paid" ? "paid" : overdue ? "overdue" : "open",
      overdue_days: overdue ? diffDays(today, r.due_date) : 0,
    };
  });

  const overdue = all.filter((i) => i.state === "overdue");
  let alert: MyBilling["alert"] = null;
  if (overdue.length > 0) {
    const oldest = overdue.reduce((m, i) => (i.due_date < m ? i.due_date : m), overdue[0].due_date);
    const until = addDays(oldest, grace);
    alert = {
      count: overdue.length,
      cents: overdue.reduce((s, i) => s + i.amount_cents, 0),
      oldestDue: oldest,
      regularizeUntil: until,
      pastGrace: today > until,
    };
  }
  return { invoices: all.slice(0, 6), alert, instructions: set.data?.payment_instructions ?? null };
}
