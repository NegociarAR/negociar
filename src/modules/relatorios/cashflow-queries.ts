import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

export interface CashFlowWeek {
  weekStart: string; // ISO (segunda-feira da semana)
  confirmedCents: number;
  projectedCents: number;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day; // volta pra segunda
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function getCashFlowProjection(): Promise<CashFlowWeek[]> {
  const session = await getSession();
  if (!session?.companyId) return [];
  const supabase = await createClient();

  const today = new Date();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 90);
  const todayISO = today.toISOString().slice(0, 10);
  const horizonISO = horizon.toISOString().slice(0, 10);

  const [{ data: installments }, { data: recurring }] = await Promise.all([
    supabase
      .from("sale_installments")
      .select("amount_cents, due_date")
      .eq("company_id", session.companyId)
      .eq("status", "pending")
      .lte("due_date", horizonISO),
    supabase
      .from("recurring_charges")
      .select("amount_cents, next_due_date")
      .eq("company_id", session.companyId)
      .eq("active", true),
  ]);

  // monta os 12 buckets semanais a partir de hoje
  const weekStart0 = startOfWeek(today);
  const weeks: CashFlowWeek[] = Array.from({ length: 12 }, (_, i) => {
    const ws = new Date(weekStart0);
    ws.setDate(ws.getDate() + i * 7);
    return { weekStart: ws.toISOString().slice(0, 10), confirmedCents: 0, projectedCents: 0 };
  });

  function addTo(dateISO: string, cents: number, key: "confirmedCents" | "projectedCents") {
    const d = new Date(dateISO + "T00:00:00");
    if (d < weekStart0) {
      // vencido/atrasado: joga na primeira semana (hoje)
      weeks[0][key] += cents;
      return;
    }
    const idx = Math.floor((d.getTime() - weekStart0.getTime()) / (7 * 86400000));
    if (idx >= 0 && idx < weeks.length) weeks[idx][key] += cents;
  }

  for (const r of installments ?? []) {
    addTo(r.due_date, r.amount_cents, "confirmedCents");
  }

  for (const r of recurring ?? []) {
    if (!r.next_due_date) continue;
    let occurrence = new Date(r.next_due_date + "T00:00:00");
    let guard = 0;
    while (occurrence <= horizon && guard < 6) {
      addTo(occurrence.toISOString().slice(0, 10), r.amount_cents, "projectedCents");
      occurrence = new Date(occurrence);
      occurrence.setMonth(occurrence.getMonth() + 1);
      guard++;
    }
  }

  return weeks;
}
