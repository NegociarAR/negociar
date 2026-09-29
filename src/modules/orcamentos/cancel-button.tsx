"use client";

import { useToast } from "@/components/toast";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelQuote } from "./actions";

export function CancelQuoteButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <button
      onClick={() => {
        if (!confirm("Cancelar este orçamento?")) return;
        startTransition(() =>
          cancelQuote(quoteId).then((res) => {
            toast(res.ok ? "Orçamento cancelado." : (res as { error?: string }).error ?? "Não foi possível cancelar.", res.ok ? "success" : "error");
            router.refresh();
          }),
        );
      }}
      disabled={pending}
      className="text-sm text-danger underline hover:opacity-80 disabled:opacity-50"
    >
      {pending ? "Cancelando..." : "Cancelar"}
    </button>
  );
}
