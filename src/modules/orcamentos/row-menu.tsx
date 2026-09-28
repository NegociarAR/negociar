"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cancelQuote } from "./actions";

const EDITABLE = ["draft", "sent", "viewed", "negotiation", "negotiation_requested"];
const CANCELABLE = ["draft", "sent", "viewed", "negotiation", "negotiation_requested"];

export function QuoteRowMenu({
  quoteId,
  status,
}: {
  quoteId: string;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const canEdit = EDITABLE.includes(status);
  const canCancel = CANCELABLE.includes(status);
  if (!canEdit && !canCancel) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-subtle hover:text-foreground"
        aria-label="Ações"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-lg border bg-surface p-1 shadow-pop">
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/orcamentos/${quoteId}/editar`);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-subtle"
            >
              Editar
            </button>
          )}
          {canCancel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!confirm("Cancelar este orçamento?")) return;
                startTransition(() => cancelQuote(quoteId).then(() => { toast("Orçamento cancelado."); router.refresh(); }));
              }}
              disabled={pending}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-subtle disabled:opacity-50"
            >
              {pending ? "Cancelando..." : "Cancelar"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
