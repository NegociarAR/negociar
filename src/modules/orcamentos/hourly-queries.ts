import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import type { HourEntry, MonthGroup, HourSummary } from "./hourly-types";

// Lançamentos de hora de um contrato, agrupados por mês (exibição), com o
// status de faturamento (sale_id) e o status do resumo mais recente que
// inclui cada lançamento, se houver.
export async function getHourlyContractData(quoteId: string) {
  const empty = { months: [] as MonthGroup[], pendingEntries: [] as HourEntry[], summaries: [] as HourSummary[] };
  const session = await getSession();
  if (!session?.companyId) return empty;

  const supabase = await createClient();
  const [entriesRes, summariesRes] = await Promise.all([
    supabase
      .from("quote_hour_entries")
      .select("id, entry_date, hours, description, sale_id")
      .eq("quote_id", quoteId)
      .order("entry_date", { ascending: false }),
    supabase
      .from("hour_summary_requests")
      .select("id, public_token, status, hours, total_cents, entry_ids, created_at")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false }),
  ]);

  const summariesData = summariesRes.data ?? [];

  // status do resumo mais recente que contém cada lançamento
  const entrySummaryStatus = new Map<string, HourEntry["summaryStatus"]>();
  for (const s of summariesData) {
    for (const entryId of (s.entry_ids as string[]) ?? []) {
      if (!entrySummaryStatus.has(entryId)) {
        entrySummaryStatus.set(entryId, s.status as HourEntry["summaryStatus"]);
      }
    }
  }

  const entries: HourEntry[] = (entriesRes.data ?? []).map((e) => ({
    id: e.id,
    entry_date: e.entry_date,
    hours: Number(e.hours),
    description: e.description,
    sale_id: e.sale_id,
    summaryStatus: entrySummaryStatus.get(e.id) ?? null,
  }));

  const groupMap = new Map<string, HourEntry[]>();
  for (const e of entries) {
    const period = e.entry_date.slice(0, 7);
    if (!groupMap.has(period)) groupMap.set(period, []);
    groupMap.get(period)!.push(e);
  }

  const months: MonthGroup[] = Array.from(groupMap.entries())
    .map(([period, ents]) => ({ period, hours: ents.reduce((s, e) => s + e.hours, 0), entries: ents }))
    .sort((a, b) => b.period.localeCompare(a.period));

  const pendingEntries = entries
    .filter((e) => !e.sale_id)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  const summaries: HourSummary[] = summariesData.map((s) => ({
    id: s.id,
    token: s.public_token,
    status: s.status as HourSummary["status"],
    hours: Number(s.hours),
    totalCents: s.total_cents,
    createdAt: s.created_at,
  }));

  return { months, pendingEntries, summaries };
}
