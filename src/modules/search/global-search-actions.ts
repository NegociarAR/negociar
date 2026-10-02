"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

export interface SearchResult {
  id: string;
  label: string;
  sublabel: string | null;
  href: string;
  kind: "cliente" | "orcamento" | "produto";
}

function customerName(c: { person_type?: string; name?: string | null; trade_name?: string | null; legal_name?: string | null }): string {
  return (c.person_type === "pf" ? c.name : (c.trade_name ?? c.legal_name)) ?? "Cliente";
}

// Busca rápida (Cmd+K): até 5 resultados por categoria, respeitando o
// RLS normal do usuário (nada de service role aqui).
export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const session = await getSession();
  if (!session?.companyId) return [];
  const companyId = session.companyId;
  const supabase = await createClient();
  const asNumber = Number(q.replace(/\D/g, ""));
  const isNumeric = /^\d+$/.test(q);

  const [customersRes, quotesRes, productsRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, person_type, name, trade_name, legal_name, stage")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .or(`name.ilike.%${q}%,trade_name.ilike.%${q}%,legal_name.ilike.%${q}%`)
      .limit(5),
    isNumeric
      ? supabase
          .from("quotes")
          .select("id, number, version, total_cents, customers(person_type, name, trade_name, legal_name)")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .eq("number", asNumber)
          .limit(5)
      : supabase
          .from("quotes")
          .select("id, number, version, total_cents, customers!inner(person_type, name, trade_name, legal_name)")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .or(`name.ilike.%${q}%,trade_name.ilike.%${q}%,legal_name.ilike.%${q}%`, { foreignTable: "customers" })
          .limit(5),
    supabase
      .from("products")
      .select("id, name, sku")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .ilike("name", `%${q}%`)
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  for (const c of customersRes.data ?? []) {
    results.push({
      id: c.id,
      label: customerName(c),
      sublabel: c.stage === "lead" ? "Lead" : c.stage === "opportunity" ? "Oportunidade" : null,
      href: `/clientes/${c.id}`,
      kind: "cliente",
    });
  }

  for (const qt of quotesRes.data ?? []) {
    const cust = (qt as { customers?: unknown }).customers as Parameters<typeof customerName>[0] | undefined;
    results.push({
      id: qt.id,
      label: `Orçamento #${qt.number}${qt.version > 1 ? `-v${qt.version}` : ""}`,
      sublabel: cust ? customerName(cust) : null,
      href: `/orcamentos/${qt.id}`,
      kind: "orcamento",
    });
  }

  for (const p of productsRes.data ?? []) {
    results.push({
      id: p.id,
      label: p.name,
      sublabel: p.sku ? `Código: ${p.sku}` : null,
      href: `/produtos/${p.id}/editar`,
      kind: "produto",
    });
  }

  return results;
}
