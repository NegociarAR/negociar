export type CompanyRole = "owner" | "admin" | "vendedor" | "financeiro" | "gestor";

// Prefixos de rota bloqueados por papel. owner/admin/gestor têm acesso
// total (lista vazia). A checagem usa prefixo, então "/orcamentos/horas"
// precisa vir listado à parte de "/orcamentos" — rota mais específica
// bloqueada vence a rota geral liberada.
export const BLOCKED_PREFIXES: Record<CompanyRole, string[]> = {
  owner: [],
  admin: [],
  gestor: [],
  vendedor: ["/recebiveis", "/orcamentos/horas", "/notas-fiscais", "/configuracoes"],
  financeiro: ["/configuracoes", "/equipe"],
};

export function isRouteBlocked(role: CompanyRole | null | undefined, pathname: string): boolean {
  if (!role) return false; // sem vínculo de role resolvido: outras camadas (sessão/empresa) já tratam isso
  const blocked = BLOCKED_PREFIXES[role] ?? [];
  return blocked.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Papéis com acesso total à gestão de equipe (convidar, remover, trocar papel).
export function canManageTeam(role: CompanyRole | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "gestor";
}
