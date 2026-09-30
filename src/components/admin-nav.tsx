"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Empresas", match: (p: string) => p === "/admin" || p.startsWith("/admin/empresas") },
  { href: "/admin/financeiro", label: "Financeiro", match: (p: string) => p.startsWith("/admin/financeiro") },
];

// Navegação do admin: a seção atual fica em destaque (cor + sublinhado).
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm">
      {ITEMS.map((i) => {
        const active = i.match(pathname);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-12 items-center whitespace-nowrap border-b-2 px-3 transition md:h-14 ${
              active
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
