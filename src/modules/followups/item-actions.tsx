"use client";

import { useTransition } from "react";
import { completeFollowup, cancelFollowup, reopenFollowup } from "./actions";

export function FollowupItemActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        onClick={() => startTransition(() => completeFollowup(id))}
        disabled={pending}
        className="font-medium text-foreground underline disabled:opacity-50"
      >
        Concluir
      </button>
      <button
        onClick={() => startTransition(() => cancelFollowup(id))}
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
  return (
    <button
      onClick={() => startTransition(() => reopenFollowup(id))}
      disabled={pending}
      className="text-sm text-muted underline hover:text-foreground disabled:opacity-50"
    >
      Reabrir
    </button>
  );
}
