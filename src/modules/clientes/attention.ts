import { createClient } from "@/lib/supabase/server";
import { todayBRT } from "@/lib/period";

type CustomerRel = {
  person_type?: string;
  name?: string | null;
  trade_name?: string | null;
  legal_name?: string | null;
} | null;

function nameOf(c: CustomerRel): string {
  if (!c) return "Contato";
  return (c.person_type === "pf" ? c.name : c.trade_name ?? c.legal_name) ?? "Contato";
}

export interface AttentionItem {
  id: string;
  customerId: string;
  name: string;
  reason: string | null;
  dueDate: string;
  overdue: boolean;
}

// "Quem eu preciso acompanhar hoje?": ações vencidas/de hoje + leads sem próxima ação.
export async function attentionToday(companyId: string) {
  const supabase = await createClient();
  const today = todayBRT();

  const [due, openContacts, pending] = await Promise.all([
    supabase
      .from("followups")
      .select("id, customer_id, due_date, reason, customers(person_type, name, trade_name, legal_name)", { count: "exact" })
      .eq("company_id", companyId)
      .eq("status", "pending")
      .lte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(5),
    supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .in("stage", ["lead", "opportunity"]),
    supabase.from("followups").select("customer_id").eq("company_id", companyId).eq("status", "pending"),
  ]);

  const withAction = new Set((pending.data ?? []).map((p) => p.customer_id));
  const noAction = (openContacts.data ?? []).filter((c) => !withAction.has(c.id)).length;

  const items: AttentionItem[] = (due.data ?? []).map((f) => ({
    id: f.id,
    customerId: f.customer_id,
    name: nameOf((f as { customers?: unknown }).customers as CustomerRel),
    reason: f.reason,
    dueDate: f.due_date,
    overdue: f.due_date < today,
  }));

  return { items, total: due.count ?? items.length, noAction };
}

// Ações pendentes de um contato (a mais próxima primeiro).
export async function pendingActionsFor(customerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("followups")
    .select("id, due_date, reason")
    .eq("customer_id", customerId)
    .eq("status", "pending")
    .order("due_date", { ascending: true })
    .limit(5);
  return (data ?? []).map((f) => ({ id: f.id, dueDate: f.due_date, reason: f.reason }));
}
