"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelQuote } from "./actions";

export function CancelQuoteButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm("Cancelar este orçamento?")) return;
        startTransition(() => cancelQuote(quoteId).then(() => router.refresh()));
      }}
      disabled={pending}
      className="text-sm text-danger underline hover:opacity-80 disabled:opacity-50"
    >
      {pending ? "Cancelando..." : "Cancelar"}
    </button>
  );
}
