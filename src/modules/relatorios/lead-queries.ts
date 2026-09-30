import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { periodStart, type Period } from "./queries";

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
}

export interface LeadFunnel {
  leads: number; // contatos que passaram pelo funil no período
  opportunities: number; // da coorte, chegaram a ter orçamento criado
  quoted: number; // da coorte, chegaram a ter orçamento enviado (não ficou só rascunho)
  converted: number;
  lost: number;
  open: number;
  rate: number; // % convertidos / leads
  steps: FunnelStep[]; // pronto para o funil visual (Lead -> Oportunidade -> Orçamento -> Cliente)
  bySource: { source: string; total: number; converted: number }[];
}

// Coorte = contatos criados no período que são/foram lead (não entram cadastros diretos de cliente).
// Cruza com orçamentos desses mesmos contatos para saber quantos avançaram cada etapa —
// não só "virou cliente ou não", mas ONDE no funil o contato parou.
export async function getLeadFunnel(period: Period): Promise<LeadFunnel> {
  const empty: LeadFunnel = {
    leads: 0, opportunities: 0, quoted: 0, converted: 0, lost: 0, open: 0, rate: 0, steps: [], bySource: [],
  };
  const session = await getSession();
  if (!session?.companyId) return empty;

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, stage, lead_source, converted_at")
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .gte("created_at", periodStart(period));

  const cohort = (data ?? []).filter((c) => c.stage !== "customer" || c.converted_at);
  const converted = cohort.filter((c) => c.stage === "customer").length;
  const lost = cohort.filter((c) => c.stage === "lost").length;

  let opportunities = 0;
  let quoted = 0;
  if (cohort.length > 0) {
    const { data: quotes } = await supabase
      .from("quotes")
      .select("customer_id, status")
      .in("customer_id", cohort.map((c) => c.id))
      .is("deleted_at", null);
    const withQuote = new Set<string>();
    const withSentQuote = new Set<string>();
    for (const q of quotes ?? []) {
      withQuote.add(q.customer_id);
      if (q.status !== "draft") withSentQuote.add(q.customer_id);
    }
    opportunities = cohort.filter((c) => withQuote.has(c.id)).length;
    quoted = cohort.filter((c) => withSentQuote.has(c.id)).length;
  }

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
    opportunities,
    quoted,
    converted,
    lost,
    open: cohort.length - converted - lost,
    rate: cohort.length ? (converted / cohort.length) * 100 : 0,
    steps: [
      { key: "leads", label: "Leads", count: cohort.length },
      { key: "opportunities", label: "Oportunidades", count: opportunities },
      { key: "quoted", label: "Orçamento enviado", count: quoted },
      { key: "converted", label: "Clientes", count: converted },
    ],
    bySource: Array.from(map, ([source, v]) => ({ source, ...v })).sort((a, b) => b.total - a.total),
  };
}

export interface LossReasonRow {
  reason: string;
  count: number;
}

// Motivos de lead perdido no período (por data em que foi marcado como perdido,
// não por data de criação — "por que perdemos ESTE mês", não "quem criado este
// mês acabou perdido algum dia").
export async function getLeadLossReasons(period: Period): Promise<LossReasonRow[]> {
  const session = await getSession();
  if (!session?.companyId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("lost_reason")
    .eq("company_id", session.companyId)
    .eq("stage", "lost")
    .not("lost_reason", "is", null)
    .gte("lost_at", periodStart(period));

  const map = new Map<string, number>();
  for (const c of data ?? []) {
    const reason = (c.lost_reason ?? "").trim();
    if (!reason) continue;
    map.set(reason, (map.get(reason) ?? 0) + 1);
  }
  return Array.from(map, ([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
