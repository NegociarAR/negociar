import { createClient } from "@/lib/supabase/server";

// Verifica os 2 itens que travam o acesso à app:
// 1. Empresa com telefone preenchido (dados mínimos para usar o sistema)
// 2. Pelo menos 1 cliente cadastrado (sem cliente não dá pra criar orçamento)
export async function checkGate(companyId: string): Promise<boolean> {
  const supabase = await createClient();

  const [companyRes, customerRes] = await Promise.all([
    supabase
      .from("companies")
      .select("phone")
      .eq("id", companyId)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .limit(1),
  ]);

  return Boolean(companyRes.data?.phone) && (customerRes.count ?? 0) > 0;
}
