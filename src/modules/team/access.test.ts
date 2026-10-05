import { describe, it, expect } from "vitest";
import { isRouteBlocked, canManageTeam, BLOCKED_PREFIXES, type CompanyRole } from "./access";

describe("isRouteBlocked — papéis com acesso total", () => {
  it.each(["owner", "admin", "gestor"] as CompanyRole[])("%s nunca é bloqueado", (role) => {
    const rotas = ["/dashboard", "/recebiveis", "/configuracoes", "/notas-fiscais", "/orcamentos/horas", "/equipe", "/qualquer-coisa"];
    for (const r of rotas) expect(isRouteBlocked(role, r)).toBe(false);
  });
});

describe("isRouteBlocked — vendedor", () => {
  const blocked = ["/recebiveis", "/orcamentos/horas", "/notas-fiscais", "/configuracoes"];
  const allowed = ["/dashboard", "/clientes", "/pipeline", "/precificar", "/orcamentos", "/produtos", "/follow-ups", "/relatorios", "/historico", "/equipe"];

  it.each(blocked)("bloqueia %s", (r) => expect(isRouteBlocked("vendedor", r)).toBe(true));
  it.each(allowed)("libera %s", (r) => expect(isRouteBlocked("vendedor", r)).toBe(false));

  it("bloqueia sub-rotas dos prefixos bloqueados", () => {
    expect(isRouteBlocked("vendedor", "/recebiveis/123")).toBe(true);
    expect(isRouteBlocked("vendedor", "/configuracoes/fiscal")).toBe(true);
  });

  it("não bloqueia por coincidência de prefixo textual sem barra (/orcamentos permanece liberado)", () => {
    expect(isRouteBlocked("vendedor", "/orcamentos")).toBe(false);
    expect(isRouteBlocked("vendedor", "/orcamentos/abc123")).toBe(false);
    expect(isRouteBlocked("vendedor", "/orcamentos/horas")).toBe(true);
    expect(isRouteBlocked("vendedor", "/orcamentos/horas/extra")).toBe(true);
  });

  it("não bloqueia uma rota que só começa parecido sem ser sub-rota real", () => {
    // "/recebiveis-relatorio" não é sub-rota de "/recebiveis"
    expect(isRouteBlocked("vendedor", "/recebiveis-relatorio")).toBe(false);
  });
});

describe("isRouteBlocked — financeiro", () => {
  const blocked = ["/configuracoes", "/equipe"];
  const allowed = ["/dashboard", "/clientes", "/recebiveis", "/orcamentos/horas", "/notas-fiscais", "/relatorios", "/historico"];

  it.each(blocked)("bloqueia %s", (r) => expect(isRouteBlocked("financeiro", r)).toBe(true));
  it.each(allowed)("libera %s", (r) => expect(isRouteBlocked("financeiro", r)).toBe(false));

  it("bloqueia sub-rotas de equipe e configurações", () => {
    expect(isRouteBlocked("financeiro", "/equipe/convidar")).toBe(true);
    expect(isRouteBlocked("financeiro", "/configuracoes/fiscal")).toBe(true);
  });
});

describe("isRouteBlocked — sem papel resolvido", () => {
  it("null/undefined nunca bloqueia (outras camadas tratam sessão/empresa ausente)", () => {
    expect(isRouteBlocked(null, "/configuracoes")).toBe(false);
    expect(isRouteBlocked(undefined, "/recebiveis")).toBe(false);
  });
});

describe("canManageTeam", () => {
  it.each(["owner", "admin", "gestor"] as CompanyRole[])("%s pode gerenciar", (r) => expect(canManageTeam(r)).toBe(true));
  it.each(["vendedor", "financeiro"] as CompanyRole[])("%s não pode gerenciar", (r) => expect(canManageTeam(r)).toBe(false));
  it("sem papel não pode gerenciar", () => expect(canManageTeam(null)).toBe(false));
});

describe("consistência do mapa", () => {
  it("todo papel tem uma entrada (nenhum undefined silencioso)", () => {
    const roles: CompanyRole[] = ["owner", "admin", "vendedor", "financeiro", "gestor"];
    for (const r of roles) expect(BLOCKED_PREFIXES[r]).toBeDefined();
  });
});
