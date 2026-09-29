"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addHourEntry } from "./hourly-actions";
import { todayBRT } from "@/lib/period";
import { useToast } from "@/components/toast";

// Lançamento rápido de horas: data + quantidade + descrição.
export function HourEntryForm({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const res = await addHourEntry({
        quoteId,
        date: String(f.get("date") ?? ""),
        hours: Number(String(f.get("hours") ?? "").replace(",", ".")),
        description: String(f.get("description") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast("Horas lançadas.");
      form.reset();
      const dateInput = form.elements.namedItem("date") as HTMLInputElement | null;
      if (dateInput) dateInput.value = todayBRT();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-lg border bg-surface p-4 shadow-card">
      <label className="space-y-1 text-xs text-muted">
        Data
        <input type="date" name="date" required defaultValue={todayBRT()} className="block h-9 rounded-md border bg-surface px-2 text-sm" />
      </label>
      <label className="space-y-1 text-xs text-muted">
        Horas
        <input name="hours" inputMode="decimal" required placeholder="2,5" className="block h-9 w-24 rounded-md border bg-surface px-2 text-sm" />
      </label>
      <label className="min-w-40 flex-1 space-y-1 text-xs text-muted">
        Descrição
        <input name="description" placeholder="Ex.: Reunião + ajustes no site" className="block h-9 w-full rounded-md border bg-surface px-2 text-sm" />
      </label>
      <button type="submit" disabled={pending} className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg disabled:opacity-50">
        {pending ? "Salvando..." : "Lançar"}
      </button>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </form>
  );
}
