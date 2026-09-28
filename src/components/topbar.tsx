"use client";

import { usePathname } from "next/navigation";

// título da barra por rota (prefixo)
const TITLES: { prefix: string; label: string }[] = [
  { prefix: "/dashboard", label: "Início" },
  { prefix: "/clientes", label: "Clientes" },
  { prefix: "/precificar", label: "Precificar" },
  { prefix: "/orcamentos", label: "Orçamentos" },
  { prefix: "/produtos", label: "Produtos" },
  { prefix: "/follow-ups", label: "Follow-ups" },
  { prefix: "/configuracoes", label: "Configurações" },
  { prefix: "/historico", label: "Histórico" },
];

export function Topbar() {
  const pathname = usePathname();
  const match = TITLES.find((t) => pathname.startsWith(t.prefix));
  const label = match?.label ?? "NEGOCIAR";

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center border-b bg-surface/80 px-5 backdrop-blur-sm">
      <span className="text-[13px] font-semibold">{label}</span>
    </header>
  );
}
