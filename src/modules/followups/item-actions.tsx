"use client";

import { useToast } from "@/components/toast";
import { useTransition } from "react";
import { completeFollowup, cancelFollowup, reopenFollowup } from "./actions";

export function FollowupItemActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        onClick={() => startTransition(async () => { await completeFollowup(id); toast("Follow-up concluído."); })}
        disabled={pending}
        className="font-medium text-foreground underline disabled:opacity-50"
      >
        Concluir
      </button>
      <button
        onClick={() => startTransition(async () => { await cancelFollowup(id); toast("Follow-up cancelado."); })}
        disabled={pending}
        className="text-muted hover:text-foreground disabled:opacity-50"
      >
        Cancelar
      </button>
    </div>
  );
}

export function ReopenButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <button
      onClick={() => startTransition(async () => { await reopenFollowup(id); toast("Follow-up reaberto."); })}
      disabled={pending}
      className="text-sm text-muted underline hover:text-foreground disabled:opacity-50"
    >
      Reabrir
    </button>
  );
}
