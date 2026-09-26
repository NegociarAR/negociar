// Status de relacionamento derivado do tempo sem contato.
// active (🟢) → sem_retorno (🟡) após N dias → esquecido (🔴) após M dias.

export type RelStatus = "active" | "stale" | "forgotten";

export interface RelThresholds {
  yellowDays: number; // vira "sem retorno"
  redDays: number; // vira "esquecido"
}

export function relStatus(
  lastContactISO: string | null,
  t: RelThresholds,
): RelStatus {
  if (!lastContactISO) return "forgotten";
  const days =
    (Date.now() - new Date(lastContactISO).getTime()) / (1000 * 60 * 60 * 24);
  if (days >= t.redDays) return "forgotten";
  if (days >= t.yellowDays) return "stale";
  return "active";
}

export const REL_LABELS: Record<RelStatus, string> = {
  active: "Em dia",
  stale: "Sem retorno",
  forgotten: "Esquecido",
};

export function daysSince(lastContactISO: string | null): number | null {
  if (!lastContactISO) return null;
  return Math.floor(
    (Date.now() - new Date(lastContactISO).getTime()) / (1000 * 60 * 60 * 24),
  );
}
