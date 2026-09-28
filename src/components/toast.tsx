"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type Kind = "success" | "error" | "info";
interface Item { id: number; message: string; kind: Kind }
type ToastFn = (message: string, kind?: Kind) => void;

const Ctx = createContext<ToastFn | null>(null);
const FLASH_KEY = "negociar:flash";

// Aviso para a PRÓXIMA página (ex.: salvou e redirecionou). Some se a página de destino trouxe erro.
export function flash(message: string, kind: Kind = "success") {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ m: message, k: kind, t: Date.now() }));
  } catch {}
}

export function useToast(): ToastFn {
  return useContext(Ctx) ?? (() => {});
}

const STYLE: Record<Kind, { bar: string; icon: React.ReactNode }> = {
  success: { bar: "border-l-success", icon: <CheckCircle2 size={16} className="text-success" /> },
  error: { bar: "border-l-danger", icon: <AlertCircle size={16} className="text-danger" /> },
  info: { bar: "border-l-primary", icon: <Info size={16} className="text-primary" /> },
};

// Mostra o aviso deixado pela página anterior. Reage a mudança de rota E de query:
// se o destino trouxe ?erro= (ou ?limite=), o aviso de sucesso é descartado.
function FlashListener({ show }: { show: ToastFn }) {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FLASH_KEY);
      if (!raw) return;
      sessionStorage.removeItem(FLASH_KEY);
      const f = JSON.parse(raw) as { m: string; k: Kind; t: number };
      if (Date.now() - f.t > 10000 || search.get("erro") || search.get("limite")) return;
      show(f.m, f.k);
    } catch {}
  }, [pathname, search, show]);
  return null;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((p) => p.filter((t) => t.id !== id)), []);
  const toast = useCallback<ToastFn>(
    (message, kind = "success") => {
      const id = ++seq.current;
      setItems((p) => [...p.slice(-2), { id, message, kind }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <FlashListener show={toast} />
      </Suspense>
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 md:bottom-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border border-l-2 bg-surface px-3.5 py-3 text-sm shadow-pop ${STYLE[t.kind].bar}`}
          >
            <span className="mt-0.5 shrink-0">{STYLE[t.kind].icon}</span>
            <span className="min-w-0 flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Fechar" className="shrink-0 text-muted hover:text-foreground">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

// Coloque dentro de um <form>: avisa ao enviar. Serve para formulários com server action + redirect
// (o aviso aparece na página de destino) ou, com `immediate`, para ações que ficam na mesma página.
export function FlashOnSubmit({ message, immediate = false }: { message: string; immediate?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const toast = useToast();
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onSubmit = () => (immediate ? toast(message) : flash(message));
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [message, immediate, toast]);
  return <span ref={ref} hidden />;
}
