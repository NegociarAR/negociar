"use client";

import { usePathname } from "next/navigation";

// Rotas que precisam de mais largura que o padrão de leitura (1024px) —
// hoje só o Pipeline (board de 4 colunas). Todas as outras continuam
// exatamente como eram: nada muda para elas.
const WIDE_ROUTES = ["/pipeline"];

export function ContentContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWide = WIDE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  return (
    <div className={`mx-auto w-full flex-1 p-5 md:p-7 ${isWide ? "max-w-none" : "max-w-5xl"}`}>
      {children}
    </div>
  );
}
