"use client";

import { useState } from "react";
import { createFollowup } from "./actions";
import { Field, Input, Button } from "@/components/ui/form";

export function NewFollowupForm({
  customers,
}: {
  customers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        + Novo follow-up
      </Button>
    );
  }

  return (
    <form
      action={createFollowup}
      className="space-y-4 rounded-lg border bg-surface p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente">
          <select
            name="customer_id"
            required
            className="h-9 w-full rounded-lg border bg-surface px-3 text-sm"
          >
            <option value="">Selecione...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data">
          <Input name="due_date" type="date" required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Motivo">
            <Input name="reason" placeholder="Ex.: retornar sobre proposta" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Observação">
            <Input name="notes" />
          </Field>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit">Salvar</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
