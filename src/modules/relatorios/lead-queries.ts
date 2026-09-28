import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { periodStart, type Period } from "./queries";

export interface LeadFunnel {
  leads: number; // contatos que passaram pelo funil no período
  converted: number;
  lost: number;
  open: number;
  rate: number; // % convertidos
  bySource: { source: string; total: number; converted: number }[];
}

// Coorte = contatos criados no período que são/foram lead (não entram cadastros diretos de cliente).
export async function getLeadFunnel(period: Period): Promise<LeadFunnel> {
  const empty: LeadFunnel = { leads: 0, converted: 0, lost: 0, open: 0, rate: 0, bySource: [] };
  const session = await getSession();
  if (!session?.companyId) return empty;

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("stage, lead_source, converted_at")
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .gte("created_at", periodStart(period));

  const cohort = (data ?? []).filter((c) => c.stage !== "customer" || c.converted_at);
  const converted = cohort.filter((c) => c.stage === "customer").length;
  const lost = cohort.filter((c) => c.stage === "lost").length;

  const map = new Map<string, { total: number; converted: number }>();
  cohort.forEach((c) => {
    const key = c.lead_source || "Sem origem";
    const cur = map.get(key) ?? { total: 0, converted: 0 };
    cur.total += 1;
    if (c.stage === "customer") cur.converted += 1;
    map.set(key, cur);
  });

  return {
    leads: cohort.length,
    converted,
    lost,
    open: cohort.length - converted - lost,
    rate: cohort.length ? (converted / cohort.length) * 100 : 0,
    bySource: Array.from(map, ([source, v]) => ({ source, ...v })).sort((a, b) => b.total - a.total),
  };
}
