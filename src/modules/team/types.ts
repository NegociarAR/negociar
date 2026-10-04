export type CompanyRole = "owner" | "admin" | "vendedor" | "financeiro" | "gestor";

export const ROLE_LABELS: Record<CompanyRole, string> = {
  owner: "Dono",
  admin: "Administrador",
  vendedor: "Vendedor",
  financeiro: "Financeiro",
  gestor: "Gestor",
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
