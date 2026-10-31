"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelQuote } from "./actions";

export function CancelQuoteButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="text-muted">Tem certeza?</span>
        <button
          onClick={() => {
            setConfirming(false);
            startTransition(() =>
              cancelQuote(quoteId).then((res) => {
                toast(res.ok ? "Orçamento cancelado." : (res as { error?: string }).error ?? "Não foi possível cancelar.", res.ok ? "success" : "error");
                router.refresh();
              }),
            );
          }}
          disabled={pending}
          className="text-danger underline hover:opacity-80 disabled:opacity-50"
        >
          {pending ? "Cancelando..." : "Confirmar"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-muted underline hover:opacity-80">
          Voltar
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="py-2 text-sm text-danger underline hover:opacity-80"
    >
      Cancelar
    </button>
  );
}
