export type ModuleKey = "clientes" | "precifica" | "orcamentos" | "teams";

export type LimitKey =
  | "customers"
  | "quotes_per_month"
  | "products"
  | "users";

export interface PlanModules {
  clientes?: boolean;
  precifica?: boolean;
  orcamentos?: boolean;
  teams?: boolean;
}

// null = ilimitado; ausente = não aplicável (tratado como ilimitado)
export interface PlanLimits {
  customers?: number | null;
  quotes_per_month?: number | null;
  products?: number | null;
  users?: number | null;
  pdf_branding?: boolean;
}

export interface Entitlements {
  planId: string;
  planName: string;
  modules: PlanModules;
  limits: PlanLimits;
}
