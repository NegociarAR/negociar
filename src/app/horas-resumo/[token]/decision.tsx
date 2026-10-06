"use client";

import { useState, useTransition } from "react";
import { respondHourSummary } from "./actions";

// Salve como: src/app/horas-resumo/[token]/decision.tsx
export function HourSummaryDecision({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [panel, setPanel] = useState<null | "contest">(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<"approved" | "contested" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    startTransition(async () => {
      const res = await respondHourSummary(token, "approved");
      if (res.ok) setResult("approved");
      else setError("Não foi possível registrar. Tente novamente.");
    });
  }

  function contest() {
    if (note.trim().length === 0) {
      setError("Descreva o que está errado.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await respondHourSummary(token, "contested", note.trim());
      if (res.ok) setResult("contested");
      else setError("Não foi possível registrar. Tente novamente.");
    });
  }

  if (result) {
    return (
      <div className="mt-6 rounded-lg border border-l-2 border-l-foreground bg-subtle p-4 text-center text-sm">
        {result === "approved" ? "Obrigado! Horas validadas." : "Recebemos sua contestação. Entraremos em contato."}
      </div>
    );
  }

  if (panel === "contest") {
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm font-medium">O que está errado?</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Ex.: dia 05 não trabalhei, horas do dia 10 estão erradas..."
          className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={contest}
            disabled={pending}
            className="h-11 flex-1 rounded-lg bg-foreground text-sm font-medium text-background disabled:opacity-50"
          >
            {pending ? "Enviando..." : "Confirmar contestação"}
          </button>
          <button
            onClick={() => {
              setPanel(null);
              setNote("");
              setError(null);
            }}
            className="h-11 rounded-lg border px-4 text-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-2">
      <button
        onClick={approve}
        disabled={pending}
        className="h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-fg transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "..." : "Validar horas"}
      </button>
      <button
        onClick={() => setPanel("contest")}
        className="h-11 w-full rounded-lg border text-sm font-medium text-muted transition hover:bg-subtle"
      >
        Contestar
      </button>
      {error && <p className="text-center text-xs text-danger">{error}</p>}
    </div>
  );
}
