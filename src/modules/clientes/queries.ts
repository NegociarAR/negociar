import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import type { Customer } from "./types";

// Lista clientes da empresa, com busca opcional (nome/telefone/CNPJ/CPF).
export async function listCustomers(search?: string) {
  const session = await getSession();
  if (!session?.companyId) return { customers: [] as Customer[], total: 0 };

  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    query = query.or(
      `name.ilike.${s},trade_name.ilike.${s},legal_name.ilike.${s},cnpj.ilike.${s},cpf.ilike.${s},phone.ilike.${s}`,
    );
  }

  const { data, count } = await query;
  return { customers: (data ?? []) as Customer[], total: count ?? 0 };
}

// Contagem total (para o gate de limite) — ignora busca.
export async function countCustomers(): Promise<number> {
  const session = await getSession();
  if (!session?.companyId) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("company_id", session.companyId)
    .is("deleted_at", null);
  return count ?? 0;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const session = await getSession();
  if (!session?.companyId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as Customer) ?? null;
}

// Timeline do cliente (activities).
export async function getCustomerActivities(customerId: string) {
  const session = await getSession();
  if (!session?.companyId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("id, type, title, created_at")
    .eq("company_id", session.companyId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

// Prazos de status da empresa (padrão 10/30).
export async function relThresholds() {
  const session = await getSession();
  if (!session?.companyId) return { yellowDays: 10, redDays: 30 };
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("stale_yellow_days, stale_red_days")
    .eq("id", session.companyId)
    .maybeSingle();
  return {
    yellowDays: data?.stale_yellow_days ?? 10,
    redDays: data?.stale_red_days ?? 30,
  };
}

export type CustomerSort = "priority" | "forgotten" | "recent" | "name";

// Lista clientes com ordenação. O status por tempo é derivado no server
// (queries.ts é server-only) via relThresholds + relStatus na página.
export async function listCustomersSorted(
  search?: string,
  sort: CustomerSort = "recent",
) {
  const session = await getSession();
  if (!session?.companyId) return { customers: [] as Customer[], total: 0 };

  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("company_id", session.companyId)
    .is("deleted_at", null);

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    query = query.or(
      `name.ilike.${s},trade_name.ilike.${s},legal_name.ilike.${s},cnpj.ilike.${s},cpf.ilike.${s},phone.ilike.${s}`,
    );
  }

  // ordenação no banco quando possível
  if (sort === "name") {
    query = query.order("trade_name", { ascending: true, nullsFirst: false });
  } else if (sort === "recent") {
    query = query.order("last_contact_at", { ascending: false, nullsFirst: false });
  } else if (sort === "forgotten" || sort === "priority") {
    // mais esquecidos primeiro = último contato mais antigo
    query = query.order("last_contact_at", { ascending: true, nullsFirst: true });
  }

  const { data, count } = await query;
  return { customers: (data ?? []) as Customer[], total: count ?? 0 };
}
