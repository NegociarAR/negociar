"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, FileText, Package, X } from "lucide-react";
import { globalSearch, type SearchResult } from "@/modules/search/global-search-actions";

const KIND_ICON = { cliente: Users, orcamento: FileText, produto: Package } as const;
const KIND_LABEL = { cliente: "Clientes", orcamento: "Orçamentos", produto: "Produtos" } as const;

// Permite abrir a busca a partir de qualquer componente (ex.: o botão
// de lupa no Topbar), sem precisar subir o estado manualmente — o
// mesmo padrão já usado no ToastProvider.
const OpenSearchContext = createContext<() => void>(() => {});
export function useOpenSearch() {
  return useContext(OpenSearchContext);
}

// Busca global (Cmd+K / Ctrl+K), disponível em qualquer tela do app
// logado. Um componente só, montado uma vez no layout — não precisa de
// nenhuma mudança nas páginas individuais.
export function CommandPalette({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const r = await globalSearch(query);
      setResults(r);
      setLoading(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function select(r: SearchResult) {
    setOpen(false);
    router.push(r.href);
  }

  const grouped = (["cliente", "orcamento", "produto"] as const)
    .map((kind) => ({ kind, items: results.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <OpenSearchContext.Provider value={() => setOpen(true)}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border bg-surface shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b px-4 py-3">
              <Search size={16} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente, orçamento ou produto..."
                className="h-6 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
              <button onClick={() => setOpen(false)} className="shrink-0 text-muted hover:text-foreground" aria-label="Fechar">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {query.trim().length >= 2 && !loading && results.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted">Nada encontrado para &quot;{query}&quot;.</p>
              )}
              {query.trim().length < 2 && (
                <p className="px-4 py-6 text-center text-sm text-muted">Digite ao menos 2 letras para buscar.</p>
              )}
              {grouped.map((g) => {
                const Icon = KIND_ICON[g.kind];
                return (
                  <div key={g.kind} className="border-b last:border-0">
                    <p className="px-4 pt-2.5 text-xs font-medium uppercase tracking-wide text-muted">{KIND_LABEL[g.kind]}</p>
                    <ul className="pb-1.5">
                      {g.items.map((r) => (
                        <li key={`${r.kind}-${r.id}`}>
                          <button
                            onClick={() => select(r)}
                            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-subtle"
                          >
                            <Icon size={15} className="shrink-0 text-muted" />
                            <span className="min-w-0 flex-1 truncate">{r.label}</span>
                            {r.sublabel && <span className="shrink-0 text-xs text-muted">{r.sublabel}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="border-t px-4 py-2 text-right text-xs text-muted">
              <kbd className="rounded border bg-subtle px-1.5 py-0.5">Esc</kbd> para fechar
            </div>
          </div>
        </div>
      )}
    </OpenSearchContext.Provider>
  );
}
