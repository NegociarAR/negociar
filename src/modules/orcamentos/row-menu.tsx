"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cancelQuote, updateQuoteStatus } from "./actions";
import { duplicateQuote } from "./duplicate-actions";
import { QuickCloseSaleModal } from "./quick-close-sale-modal";

const EDITABLE = ["draft", "sent", "viewed", "negotiation", "negotiation_requested"];
const CANCELABLE = ["draft", "sent", "viewed", "negotiation", "negotiation_requested"];
const CAN_DECIDE = ["sent", "viewed", "negotiation", "negotiation_requested"];

export function QuoteRowMenu({
  quoteId,
  number,
  status,
  companyId,
  totalCents,
}: {
  quoteId: string;
  number: number;
  status: string;
  companyId: string;
  totalCents: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closeSaleOpen, setCloseSaleOpen] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
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
  const canCloseSale = status === "approved";
  const canDecide = CAN_DECIDE.includes(status);

  function duplicate() {
    setOpen(false);
    startTransition(() =>
      duplicateQuote(quoteId).then((res) => {
        if (res.ok) {
          toast("Orçamento duplicado como novo rascunho.");
          router.push(`/orcamentos/${res.id}/editar`);
        } else {
          toast(res.error, "error");
        }
      }),
    );
  }

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
        <div className="absolute right-0 top-9 z-30 w-48 overflow-hidden rounded-lg border bg-surface p-1 shadow-pop">
          {canDecide && !confirmReject && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  startTransition(() =>
                    updateQuoteStatus(quoteId, "approved").then((res) => {
                      toast(res.ok ? "Aprovação registrada." : (res as { error?: string }).error ?? "Erro.", res.ok ? "success" : "error");
                      router.refresh();
                    }),
                  );
                }}
                disabled={pending}
                className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-subtle disabled:opacity-50"
              >
                Registrar aprovação
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmReject(true); }}
                disabled={pending}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-subtle disabled:opacity-50"
              >
                Registrar recusa
              </button>
              <div className="my-1 border-t" />
            </>
          )}
          {confirmReject && (
            <div className="p-2" onClick={(e) => e.stopPropagation()}>
              <p className="mb-2 text-xs text-muted">Confirmar recusa do orçamento #{number}?</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setConfirmReject(false);
                    setOpen(false);
                    startTransition(() =>
                      updateQuoteStatus(quoteId, "rejected").then((res) => {
                        toast(res.ok ? "Recusa registrada." : (res as { error?: string }).error ?? "Erro.", res.ok ? "success" : "error");
                        router.refresh();
                      }),
                    );
                  }}
                  disabled={pending}
                  className="flex-1 rounded-md bg-danger px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setConfirmReject(false)}
                  className="flex-1 rounded-md border px-2 py-1.5 text-xs hover:bg-subtle"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {canCloseSale && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                setCloseSaleOpen(true);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-subtle"
            >
              Fechar venda
            </button>
          )}
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicate();
            }}
            disabled={pending}
            className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-subtle disabled:opacity-50"
          >
            {pending ? "Duplicando..." : "Duplicar"}
          </button>
          {canCancel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!confirm("Cancelar este orçamento?")) return;
                startTransition(() =>
                  cancelQuote(quoteId).then((res) => {
                    toast(res.ok ? "Orçamento cancelado." : (res as { error?: string }).error ?? "Não foi possível cancelar.", res.ok ? "success" : "error");
                    router.refresh();
                  }),
                );
              }}
              disabled={pending}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-subtle disabled:opacity-50"
            >
              {pending ? "Cancelando..." : "Cancelar"}
            </button>
          )}
        </div>
      )}
      {closeSaleOpen && (
        <QuickCloseSaleModal
          quoteId={quoteId}
          quoteNumber={number}
          companyId={companyId}
          grossCents={totalCents}
          onClose={() => setCloseSaleOpen(false)}
        />
      )}
    </div>
  );
}
