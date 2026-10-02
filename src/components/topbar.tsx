"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useOpenSearch } from "./command-palette";
import { NotificationBell } from "./notification-bell";
import type { AppNotification } from "@/modules/notifications/notification-queries";

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

export function Topbar({
  notifications,
}: {
  notifications?: { items: AppNotification[]; unreadCount: number };
}) {
  const pathname = usePathname();
  const match = TITLES.find((t) => pathname.startsWith(t.prefix));
  const label = match?.label ?? "NEGOCIAR";

  const openSearch = useOpenSearch();

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b bg-surface/80 px-5 backdrop-blur-sm">
      <span className="text-[13px] font-semibold">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={openSearch}
          className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted transition hover:bg-subtle hover:text-foreground"
        >
          <Search size={13} />
          <span className="hidden sm:inline">Buscar</span>
          <kbd className="hidden rounded border bg-subtle px-1 text-[10px] sm:inline">⌘K</kbd>
        </button>
        {notifications && <NotificationBell items={notifications.items} unreadCount={notifications.unreadCount} />}
      </div>
    </header>
  );
}
