// Tipos puros das metas mensais (sem next/headers).

export type GoalMetric = "revenue" | "new_customers";

export interface GoalProgress {
  metric: GoalMetric;
  period: string; // YYYY-MM
  target: number | null; // cents (revenue) ou contagem (new_customers); null = sem meta definida
  actual: number;
  pct: number | null; // null quando não há meta
}
