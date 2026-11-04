export type CompanyRole = "owner" | "admin" | "vendedor" | "financeiro" | "gestor";

export const ROLE_LABELS: Record<CompanyRole, string> = {
  owner: "Dono",
  admin: "Administrador",
  vendedor: "Vendedor",
  financeiro: "Financeiro",
  gestor: "Gestor",
};

export const ROLE_STYLES: Record<CompanyRole, string> = {
  owner:      "border-primary/30 bg-primary-soft text-primary",
  admin:      "border-primary/30 bg-primary-soft text-primary",
  gestor:     "border-warning/30 bg-warning/10 text-warning",
  financeiro: "border-success/30 bg-success/10 text-success",
  vendedor:   "border-border bg-subtle text-muted",
};

export interface TeamMember {
  userId: string;
  email: string;
  role: CompanyRole;
  isSelf: boolean;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: CompanyRole;
  token: string;
  createdAt: string;
  expiresAt: string;
}
