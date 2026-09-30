import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { currentPeriod } from "@/lib/period";
import type { GoalProgress } from "./goals-types";

// Progresso do mês corrente para as duas métricas (faturamento e clientes
// novos), comparando com a meta cadastrada — se houver. actual é calculado
// sempre; target vem do banco e pode ser null (sem meta definida ainda).
export async function getMonthlyGoalsProgress(companyId: string): Promise<GoalProgress[]> {
  const period = currentPeriod();
  const supabase = await createClient();
  const monthStart = `${period}-01T00:00:00-03:00`;

  const [goalsRes, salesRes, customersRes] = await Promise.all([
    supabase.from("company_goals").select("metric, target_cents, target_count").eq("company_id", companyId).eq("period", period),
    supabase.from("sales").select("total_cents").eq("company_id", companyId).eq("status", "won").gte("sold_at", monthStart),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("stage", "customer").gte("converted_at", monthStart),
  ]);

  const goalMap = new Map(goalsRes.data?.map((g) => [g.metric, g]) ?? []);
  const revenueActual = (salesRes.data ?? []).reduce((s, r) => s + r.total_cents, 0);
  const customersActual = customersRes.count ?? 0;

  const build = (metric: GoalProgress["metric"], actual: number, target: number | null): GoalProgress => ({
    metric,
    period,
    target,
    actual,
    pct: target && target > 0 ? Math.min(100, (actual / target) * 100) : null,
  });

  const revenueGoal = goalMap.get("revenue");
  const customersGoal = goalMap.get("new_customers");

  return [
    build("revenue", revenueActual, revenueGoal?.target_cents ?? null),
    build("new_customers", customersActual, customersGoal?.target_count ?? null),
  ];
}
