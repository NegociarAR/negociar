"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Plus } from "lucide-react";
import { QUICK_ACTIONS, type NavItem, type BadgeKey } from "./nav-items";
import { ICONS } from "./nav-icons";
import { signOut } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/theme-toggle";

// 3 abas fixas + botão central "Criar" + "Mais" (restante do menu, tema e sair —
// no mobile a sidebar some, então tudo que ela tem precisa estar aqui).
// Recebe os itens já filtrados por entitlement.
export function BottomNav({
  items,
  quickActions,
  badges,
}: {
  items: NavItem[];
  quickActions: typeof QUICK_ACTIONS;
  badges?: Record<BadgeKey, number>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<"create" | "more" | null>(null);

  const left = items.slice(0, 2);
  const right = items.slice(2, 3);
  const more = items.slice(3);
  const moreActive = more.some((i) => isActive(pathname, i.href));
  const moreCount = more.reduce((s, i) => s + (i.badge ? badges?.[i.badge] ?? 0 : 0), 0);
  const close = () => setOpen(null);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={close}>
          {open === "create" ? (
            <div
              className="absolute bottom-20 left-1/2 w-56 max-w-[calc(100%-2rem)] -translate-x-1/2 space-y-1 rounded-lg border bg-surface p-2 shadow-pop"
              onClick={(e) => e.stopPropagation()}
            >
              {quickActions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={close}
                  className="flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-subtle"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          ) : (
            <div
              className="absolute inset-x-3 bottom-20 max-h-[70dvh] overflow-y-auto rounded-lg border bg-surface p-2 shadow-pop"
              onClick={(e) => e.stopPropagation()}
            >
              {more.map((i) => {
                const Icon = ICONS[i.icon];
                const count = i.badge ? badges?.[i.badge] ?? 0 : 0;
                const active = isActive(pathname, i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={close}
                    className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm ${
                      active ? "bg-primary-soft font-medium text-primary" : "hover:bg-subtle"
                    }`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                    <span className="flex-1">{i.label}</span>
                    {count > 0 && (
                      <span className="tabular min-w-5 rounded-full bg-subtle px-1.5 text-center text-xs font-medium text-muted">
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
              <div className="mt-1 border-t pt-1 [&_button]:min-h-11 [&_button]:px-3 [&_button]:text-sm">
                <ThemeToggle />
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-md text-muted transition hover:bg-subtle hover:text-foreground"
                  >
                    <LogOut size={16} strokeWidth={1.8} />
                    Sair
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch justify-around border-t bg-surface md:hidden">
        {left.map((i) => (
          <Tab key={i.href} item={i} active={isActive(pathname, i.href)} count={i.badge ? badges?.[i.badge] : 0} />
        ))}

        <div className="flex items-center">
          <button
            onClick={() => setOpen((v) => (v === "create" ? null : "create"))}
            aria-label="Criar"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-fg shadow-md"
          >
            <Plus size={24} strokeWidth={2} />
          </button>
        </div>

        {right.map((i) => (
          <Tab key={i.href} item={i} active={isActive(pathname, i.href)} count={i.badge ? badges?.[i.badge] : 0} />
        ))}

        <button
          onClick={() => setOpen((v) => (v === "more" ? null : "more"))}
          aria-label="Mais opções"
          className={`relative flex min-w-16 flex-col items-center justify-center gap-0.5 text-[11px] ${
            moreActive || open === "more" ? "text-primary" : "text-muted"
          }`}
        >
          <Menu size={20} strokeWidth={moreActive ? 2.2 : 1.8} />
          Mais
          {moreCount > 0 && <Dot />}
        </button>
      </nav>
    </>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function Dot() {
  return <span className="absolute right-4 top-2.5 h-2 w-2 rounded-full bg-primary" />;
}

function Tab({ item, active, count = 0 }: { item: NavItem; active: boolean; count?: number }) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      className={`relative flex min-w-16 flex-col items-center justify-center gap-0.5 text-[11px] ${
        active ? "text-primary" : "text-muted"
      }`}
    >
      <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
      {item.label}
      {count > 0 && <Dot />}
    </Link>
  );
}
