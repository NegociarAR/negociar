"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLead } from "./lead-actions";
import { LEAD_SOURCES } from "./stages";
import { parseBRLToCents } from "@/lib/format";
import { Field, Input, Button } from "@/components/ui/form";

// Cadastro rápido de lead: nome, WhatsApp, origem e valor potencial.
export function LeadForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const value = String(f.get("value") ?? "").trim();
    startTransition(async () => {
      const res = await createLead({
        personType: f.get("type") === "pj" ? "pj" : "pf",
        name: String(f.get("name") ?? ""),
        whatsapp: String(f.get("whatsapp") ?? ""),
        source: String(f.get("source") ?? ""),
        estimatedValueCents: value ? parseBRLToCents(value) : null,
      });
      if (!res.ok) {
        setError(res.error === "limit" ? "Limite de contatos do plano atingido." : res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        + Novo lead
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setOpen(false)}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-lg border bg-surface p-5 shadow-pop"
      >
        <h2 className="text-sm font-semibold">Novo lead</h2>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tipo">
            <select name="type" className="h-9 w-full rounded-lg border bg-surface px-2 text-sm">
              <option value="pf">Pessoa</option>
              <option value="pj">Empresa</option>
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Nome">
              <Input name="name" required autoFocus />
            </Field>
          </div>
        </div>
        <Field label="WhatsApp">
          <Input name="whatsapp" inputMode="tel" placeholder="47 99999-0000" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Origem">
            <select name="source" className="h-9 w-full rounded-lg border bg-surface px-2 text-sm">
              <option value="">—</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Valor potencial (R$)">
            <Input name="value" inputMode="decimal" placeholder="0,00" />
          </Field>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar lead"}</Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
