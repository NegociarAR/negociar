"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Barra fina no topo da tela, que acende sozinha em QUALQUER navegação
// interna (clique em link, menu, item de lista) e some quando a página
// de destino termina de carregar. Resolve o "cliquei e nada mudou,
// parece que travou" sem precisar de um loading.tsx em cada uma das
// ~30 rotas do app — um componente só, no layout raiz, cobre todas.
function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement)?.closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/") || link.target === "_blank" || link.hasAttribute("download")) return;
      const current = window.location.pathname + window.location.search;
      if (href === current) return;

      timers.current.forEach((t) => window.clearTimeout(t));
      setVisible(true);
      setWidth(0);
      requestAnimationFrame(() => setWidth(30));
      timers.current = [
        window.setTimeout(() => setWidth(65), 180),
        window.setTimeout(() => setWidth(85), 600),
      ];
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // a navegação terminou quando a rota (ou a query) realmente mudou — completa e esconde
  useEffect(() => {
    if (!visible) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    setWidth(100);
    const hide = window.setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 200);
    return () => window.clearTimeout(hide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-[100] h-[3px] w-full bg-transparent">
      <div className="h-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${width}%` }} />
    </div>
  );
}

export function RouteProgress() {
  // useSearchParams exige um Suspense boundary
  return (
    <Suspense fallback={null}>
      <ProgressBar />
    </Suspense>
  );
}
