import type { LucideIcon } from "lucide-react";

// Chip de ícone colorido por módulo, usado no cabeçalho das telas de lista
// (mesma identidade visual dos cards do dashboard: azul = ClienteZap,
// verde = Precifica, roxo = OrçaFácil).
const MODULE_STYLE = {
  clientes: "bg-module-clientes/10 text-module-clientes",
  precifica: "bg-module-precifica/10 text-module-precifica",
  orcamentos: "bg-module-orcamentos/10 text-module-orcamentos",
  // área da plataforma (admin) — não pertence a um módulo do cliente,
  // usa um tom neutro em vez de uma das 3 cores de marca.
  admin: "bg-subtle text-foreground",
} as const;

export function PageIcon({
  module,
  icon: Icon,
}: {
  module: keyof typeof MODULE_STYLE;
  icon: LucideIcon;
}) {
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${MODULE_STYLE[module]}`}>
      <Icon size={18} strokeWidth={1.8} />
    </div>
  );
}
