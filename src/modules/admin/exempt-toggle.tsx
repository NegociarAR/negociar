"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBillingExempt } from "./billing-actions";

// Isenta a empresa de cobrança (ex.: empresa de teste).
export function ExemptToggle({ companyId, exempt }: { companyId: string; exempt: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function toggle() {
    const next = !exempt;
    if (
      next &&
      !confirm(
        "Isentar esta empresa de cobrança? Ela deixa de gerar mensalidades e sai das métricas do financeiro. Títulos em aberto serão cancelados.",
      )
    ) {
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await setBillingExempt(companyId, next);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      if (next && res.n) setMsg(`${res.n} título(s) em aberto cancelado(s).`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={exempt} onChange={toggle} disabled={pending} className="mt-0.5 h-4 w-4" />
        <span>
          <span className="font-medium">Isenta de cobrança</span>
          <span className="block text-xs text-muted">
            Para empresas de teste ou cortesia: não gera mensalidade, não entra no financeiro e não é bloqueada por atraso.
          </span>
        </span>
      </label>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}
