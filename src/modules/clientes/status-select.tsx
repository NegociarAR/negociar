"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition } from "react";
import { setCustomerStatus } from "./actions";

const OPTIONS = [
  { id: "active", label: "Ativo" },
  { id: "inactive", label: "Inativo" },
  { id: "blocked", label: "Bloqueado" },
] as const;

export function CustomerStatusSelect({
  customerId,
  status,
}: {
  customerId: string;
  status: "active" | "inactive" | "blocked";
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function change(next: "active" | "inactive" | "blocked") {
    setValue(next);
    startTransition(async () => {
      await setCustomerStatus(customerId, next);
      const label = { active: "Ativo", inactive: "Inativo", blocked: "Bloqueado" }[next];
      toast(`Status do cliente alterado para ${label}.`);
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Status</span>
      <select
        value={value}
        onChange={(e) => change(e.target.value as typeof value)}
        disabled={pending}
        className="h-8 rounded-md border bg-surface px-2 text-sm"
      >
        {OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
