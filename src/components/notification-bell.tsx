"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { markNotificationRead, markAllNotificationsRead } from "@/modules/notifications/notification-actions";
import type { AppNotification } from "@/modules/notifications/notification-queries";

const TYPE_HREF: Record<string, string> = {
  followup_due: "/follow-ups",
  installment_overdue: "/recebiveis",
  quote_viewed: "/orcamentos",
};

function timeAgo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.round(diffH / 24)}d`;
}

// Sino de notificações no Topbar. Recebe os dados já carregados pelo
// layout (mesmo padrão dos contadores da sidebar) — sem buscar nada
// sozinho, só abre/fecha o dropdown e marca como lida.
export function NotificationBell({ items, unreadCount }: { items: AppNotification[]; unreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function openItem(n: AppNotification) {
    setOpen(false);
    if (!n.readAt) startTransition(() => { markNotificationRead(n.id); });
    router.push(TYPE_HREF[n.type] ?? "/dashboard");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-subtle hover:text-foreground"
        aria-label="Notificações"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-80 overflow-hidden rounded-lg border bg-surface shadow-pop">
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <p className="text-sm font-semibold">Notificações</p>
            {unreadCount > 0 && (
              <button
                onClick={() => startTransition(() => markAllNotificationsRead().then(() => router.refresh()))}
                disabled={pending}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Nenhuma notificação ainda.</p>}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={`block w-full border-b px-3 py-2.5 text-left text-sm transition last:border-0 hover:bg-subtle ${
                  !n.readAt ? "bg-primary-soft" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`min-w-0 flex-1 ${!n.readAt ? "font-medium" : ""}`}>{n.title}</p>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(n.createdAt)}</span>
                </div>
                {n.body && <p className="mt-0.5 truncate text-xs text-muted">{n.body}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
