import type { ModuleKey } from "@/lib/entitlements/types";

export type IconKey =
  | "home"
  | "users"
  | "calc"
  | "quote"
  | "box"
  | "bell"
  | "settings"
  | "wallet"
  | "chart";

export type BadgeKey = "followups" | "openQuotes" | "receivables";

export interface NavItem {
  href: string;
  label: string;
  icon: IconKey;
  module?: ModuleKey; // se definido, só aparece quando o plano libera
  badge?: BadgeKey; // contador dinâmico (calculado no layout)
}

export interface NavSection {
  label?: string; // rótulo da seção (opcional)
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ href: "/dashboard", label: "Início", icon: "home" }],
  },
  {
    label: "Comercial",
    items: [
      { href: "/clientes", label: "Clientes", icon: "users", module: "clientes" },
      { href: "/precificar", label: "Precificar", icon: "calc", module: "precifica" },
      {
        href: "/orcamentos",
        label: "Orçamentos",
        icon: "quote",
        module: "orcamentos",
        badge: "openQuotes",
      },
      { href: "/produtos", label: "Produtos", icon: "box", module: "precifica" },
    ],
  },
  {
    label: "Acompanhamento",
    items: [
      {
        href: "/follow-ups",
        label: "Follow-ups",
        icon: "bell",
        module: "clientes",
        badge: "followups",
      },
    ],
  },
  {
    label: "Financeiro",
    items: [
      {
        href: "/recebiveis",
        label: "Recebíveis",
        icon: "wallet",
        module: "orcamentos",
        badge: "receivables",
      },
    ],
  },
  {
    label: "Análise",
    items: [
      {
        href: "/relatorios",
        label: "Relatórios",
        icon: "chart",
        module: "orcamentos",
      },
    ],
  },
  {
    items: [{ href: "/configuracoes", label: "Configurações", icon: "settings" }],
  },
];

// lista achatada (mantida para o bottom-nav e filtros existentes)
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

// atalhos do botão + (bottom nav mobile)
export const QUICK_ACTIONS: { href: string; label: string; module?: ModuleKey }[] =
  [
    { href: "/clientes/novo", label: "Novo cliente", module: "clientes" },
    { href: "/orcamentos/novo", label: "Novo orçamento", module: "orcamentos" },
    { href: "/produtos/novo", label: "Novo produto", module: "precifica" },
    { href: "/precificar", label: "Nova precificação", module: "precifica" },
  ];
