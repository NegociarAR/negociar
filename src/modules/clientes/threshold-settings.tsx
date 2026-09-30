"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition } from "react";
import { setRelThresholds } from "./actions";

export function ThresholdSettings({
  yellowDays,
  redDays,
}: {
  yellowDays: number;
  redDays: number;
}) {
  const [open, setOpen] = useState(false);
  const [yellow, setYellow] = useState(yellowDays);
  const [red, setRed] = useState(redDays);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function save() {
    setSaved(false);
    startTransition(async () => {
      await setRelThresholds(yellow, red);
      setSaved(true);
      toast("Prazos de acompanhamento salvos.");
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="py-2 text-sm text-muted underline hover:text-foreground"
      >
        Prazos de status
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-surface p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">Prazos de status</span>
        <button onClick={() => setOpen(false)} className="-my-2 py-2 text-muted">
          Fechar
        </button>
      </div>
      <label className="block space-y-1">
        <span className="text-muted">
          Sem retorno após <strong>{yellow}</strong> dias
        </span>
        <input
          type="range"
          min={1}
          max={60}
          value={yellow}
          onChange={(e) => setYellow(Number(e.target.value))}
          className="w-full accent-black"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-muted">
          Esquecido após <strong>{red}</strong> dias
        </span>
        <input
          type="range"
          min={yellow + 1}
          max={120}
          value={red}
          onChange={(e) => setRed(Number(e.target.value))}
          className="w-full accent-black"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="h-10 md:h-9 rounded-lg bg-primary px-4 font-medium text-primary-fg disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        {saved && <span className="text-xs text-muted">Salvo.</span>}
      </div>
    </div>
  );
}
