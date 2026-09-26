"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { QUICK_ACTIONS, type NavItem } from "./nav-items";
import { ICONS } from "./nav-icons";

// Mostra 4 itens fixos + botão central. Recebe já filtrados por entitlement.
export function BottomNav({
  items,
  quickActions,
}: {
  items: NavItem[];
  quickActions: typeof QUICK_ACTIONS;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const left = items.slice(0, 2);
  const right = items.slice(2, 4);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute bottom-20 left-1/2 w-56 -translate-x-1/2 space-y-1 rounded-lg border bg-surface p-2 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm hover:bg-subtle"
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t bg-surface md:hidden">
        {left.map((i) => (
          <Tab key={i.href} item={i} active={isActive(pathname, i.href)} />
        ))}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Criar"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-fg shadow-md"
        >
          <Plus size={24} strokeWidth={2} />
        </button>

        {right.map((i) => (
          <Tab key={i.href} item={i} active={isActive(pathname, i.href)} />
        ))}
      </nav>
    </>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      className={`flex flex-col items-center gap-0.5 text-[11px] ${
        active ? "text-primary" : "text-muted"
      }`}
    >
      <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
      {item.label}
    </Link>
  );
}
