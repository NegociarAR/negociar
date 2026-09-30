"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import type { GoalMetric } from "./goals-types";

type Result = { ok: true } | { ok: false; error: string };

// Define (ou atualiza) a meta do mês para uma métrica. value é em reais
// (não centavos) para faturamento, e em unidades para clientes novos —
// a conversão para centavos acontece aqui.
export async function setMonthlyGoal(metric: GoalMetric, period: string, value: number): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  if (!/^\d{4}-\d{2}$/.test(period)) return { ok: false, error: "Período inválido." };
  if (!(value > 0)) return { ok: false, error: "Informe um valor maior que zero." };

  const supabase = await createClient();
  const patch =
    metric === "revenue"
      ? { target_cents: Math.round(value * 100), target_count: null }
      : { target_cents: null, target_count: Math.round(value) };

  const { error } = await supabase
    .from("company_goals")
    .upsert(
      { company_id: session.companyId, metric, period, created_by: session.user.id, ...patch },
      { onConflict: "company_id,metric,period" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
