// Estágios comerciais do contato (arquivo puro: seguro para client components).
export type Stage = "lead" | "opportunity" | "customer" | "lost";

export const STAGE_LABELS: Record<Stage, string> = {
  lead: "Lead",
  opportunity: "Oportunidade",
  customer: "Cliente",
  lost: "Perdido",
};

export const STAGE_TABS: { key: Stage | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "lead", label: "Leads" },
  { key: "opportunity", label: "Oportunidades" },
  { key: "customer", label: "Clientes" },
  { key: "lost", label: "Perdidos" },
];

export const STAGE_BADGE: Record<Stage, string> = {
  lead: "bg-primary-soft text-primary border-transparent",
  opportunity: "bg-warning/10 text-warning border-warning/30",
  customer: "",
  lost: "text-muted line-through",
};

export const LEAD_SOURCES = [
  "Prospecção ativa",
  "WhatsApp",
  "Instagram",
  "Indicação",
  "Site",
  "Evento",
  "Google",
  "Outro",
];

export const ACTION_KINDS: { key: string; label: string }[] = [
  { key: "call", label: "Ligar" },
  { key: "whatsapp", label: "Enviar WhatsApp" },
  { key: "proposal", label: "Enviar proposta" },
  { key: "meeting", label: "Reunião" },
  { key: "resume", label: "Retomar negociação" },
  { key: "other", label: "Outro" },
];

export const KIND_LABELS: Record<string, string> = Object.fromEntries(
  ACTION_KINDS.map((k) => [k.key, k.label]),
);
