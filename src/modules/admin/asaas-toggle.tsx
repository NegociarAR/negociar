"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enableAsaasBilling, disableAsaasBilling } from "./billing-asaas-actions";

// Salve como: src/modules/admin/asaas-toggle.tsx
// Ativa/desativa cobrança automática via Asaas (Pix/cartão/boleto) para
// esta empresa. Coexiste com o billing manual — desativado é o padrão.
export function AsaasToggle({ companyId, enabled }: { companyId: string; enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [msg, setMsg] = useState<string | null>(null);

  function toggle() {
    const next = !enabled;
    setMsg(null);
    startTransition(async () => {
      const res = next ? await enableAsaasBilling(companyId) : await disableAsaasBilling(companyId);
      if (!res.ok) {
        setMsg(res.error);
        toast(res.error, "error");
        return;
      }
      toast(next ? "Cobrança automática via Asaas ativada." : "Cobrança automática desativada. Volta pro billing manual.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={enabled} onChange={toggle} disabled={pending} className="mt-0.5 h-4 w-4" />
        <span>
          <span className="font-medium">Cobrança automática (Asaas)</span>
          <span className="block text-xs text-muted">
            Mensalidade cobrada via Pix, cartão ou boleto automaticamente. Exige CNPJ cadastrado.
          </span>
        </span>
      </label>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}
