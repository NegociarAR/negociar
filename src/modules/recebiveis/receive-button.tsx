"use client";

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

  if (received) {
    return (
      <button
        onClick={() => startTransition(() => undoReceived(id))}
        disabled={pending}
        className="text-xs text-muted underline hover:text-foreground disabled:opacity-50"
      >
        Desfazer
      </button>
    );
  }

  return (
    <button
      onClick={() => startTransition(() => markReceived(id))}
      disabled={pending}
      className="h-8 rounded-md border px-3 text-xs font-medium transition hover:bg-subtle disabled:opacity-50"
    >
      {pending ? "..." : "Receber"}
    </button>
  );
}
