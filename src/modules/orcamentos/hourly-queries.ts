import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import type { HourEntry, MonthGroup } from "./hourly-types";

// Lançamentos de hora de um contrato, agrupados por mês, cruzados com
// as faturas (vendas) já geradas para cada período.
export async function getHourlyContractData(quoteId: string) {
  const session = await getSession();
  if (!session?.companyId) return { months: [] as MonthGroup[] };

  const supabase = await createClient();
  const [entriesRes, salesRes] = await Promise.all([
    supabase
      .from("quote_hour_entries")
      .select("id, entry_date, hours, description")
      .eq("quote_id", quoteId)
      .order("entry_date", { ascending: false }),
    supabase
      .from("sales")
      .select("id, reference_period, total_cents, sale_installments(status)")
      .eq("quote_id", quoteId)
      .not("reference_period", "is", null),
  ]);

  const entries = (entriesRes.data ?? []) as HourEntry[];

  const invoiceByPeriod = new Map<string, { totalCents: number; status: string }>();
  for (const s of salesRes.data ?? []) {
    const insts = (s as { sale_installments?: { status: string }[] }).sale_installments ?? [];
    invoiceByPeriod.set(s.reference_period as string, {
      totalCents: s.total_cents,
      status: insts[0]?.status ?? "pending",
    });
  }

  const groupMap = new Map<string, HourEntry[]>();
  for (const e of entries) {
    const period = e.entry_date.slice(0, 7);
    if (!groupMap.has(period)) groupMap.set(period, []);
    groupMap.get(period)!.push(e);
  }
  // meses só com fatura (sem lançamento visível, ex.: lançamento excluído depois) também aparecem
  for (const period of invoiceByPeriod.keys()) {
    if (!groupMap.has(period)) groupMap.set(period, []);
  }

  const months: MonthGroup[] = Array.from(groupMap.entries())
    .map(([period, ents]) => {
      const inv = invoiceByPeriod.get(period);
      return {
        period,
        hours: ents.reduce((s, e) => s + Number(e.hours), 0),
        entries: ents,
        invoiced: Boolean(inv),
        invoiceTotalCents: inv?.totalCents ?? null,
        invoiceStatus: (inv?.status as MonthGroup["invoiceStatus"]) ?? null,
      };
    })
    .sort((a, b) => b.period.localeCompare(a.period));

  return { months };
}
