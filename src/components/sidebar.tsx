"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  NAV_SECTIONS,
  type NavItem,
  type BadgeKey,
} from "./nav-items";
import { ICONS } from "./nav-icons";
import { signOut } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoN } from "@/components/logo";
import { PlainSubmitButton } from "@/components/ui/submit-button";
import type { CompanyRole } from "@/modules/team/access";

export function Sidebar({
  companyName,
  userEmail,
  modules,
  badges,
  myRole,
}: {
  companyName: string;
  userEmail: string;
  modules: Record<string, boolean>;
  badges: Record<BadgeKey, number>;
  myRole: CompanyRole | null;
}) {
  const pathname = usePathname();

  const visible = (item: NavItem) =>
    (!item.module || modules[item.module]) && !item.blockedRoles?.includes(myRole as CompanyRole);

  return (
    <aside className="hidden w-56 shrink-0 border-r bg-surface md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <LogoN size={22} />
        <span className="truncate text-[13px] font-semibold">{companyName}</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {NAV_SECTIONS.map((section, i) => {
          const items = section.items.filter(visible);
          if (items.length === 0) return null;
          return (
            <div key={i} className={i > 0 ? "mt-4" : ""}>
              {section.label && (
                <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted/70">
                  {section.label}
                </p>
              )}
              <div className="space-y-px">
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = ICONS[item.icon];
                  const count = item.badge ? badges[item.badge] : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition ${
                        active
                          ? "bg-primary-soft font-medium text-primary"
                          : "text-muted hover:bg-subtle hover:text-foreground"
                      }`}
                    >
                      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                      <span className="flex-1">{item.label}</span>
                      {count > 0 && (
                        <span
                          className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-medium tabular ${
                            active
                              ? "bg-primary text-primary-fg"
                              : "bg-subtle text-muted"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <p className="truncate px-2.5 py-1 text-xs text-muted">{userEmail}</p>
        <ThemeToggle />
        <form action={signOut}>
          <PlainSubmitButton
            pendingText="Saindo..."
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted transition hover:bg-subtle hover:text-foreground"
          >
            <LogOut size={16} strokeWidth={1.8} />
            Sair
          </PlainSubmitButton>
        </form>
      </div>
    </aside>
  );
}
