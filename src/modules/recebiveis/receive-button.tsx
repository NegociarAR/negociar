"use client";

import { useToast } from "@/components/toast";
import { useTransition } from "react";
import { markReceived, undoReceived } from "./actions";

export function ReceiveButton({
  id,
  received,
}: {
  id: string;
  received?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (received) {
    return (
      <button
        onClick={() => startTransition(async () => { await undoReceived(id); toast("Recebimento desfeito."); })}
        disabled={pending}
        className="text-xs text-muted underline hover:text-foreground disabled:opacity-50"
      >
        Desfazer
      </button>
    );
  }

  return (
    <button
      onClick={() => startTransition(async () => { await markReceived(id); toast("Recebimento registrado."); })}
      disabled={pending}
      className="h-8 rounded-md border px-3 text-xs font-medium transition hover:bg-subtle disabled:opacity-50"
    >
      {pending ? "..." : "Receber"}
    </button>
  );
}
