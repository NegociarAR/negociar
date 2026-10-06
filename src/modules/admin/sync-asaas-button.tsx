"use client";

import { useToast } from "@/components/toast";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncAsaasCharges } from "./billing-asaas-actions";

// Salve como: src/modules/admin/sync-asaas-button.tsx
// Cria no Asaas a cobrança de cada título em aberto das empresas que
// estão no modo de cobrança automática. Rode depois de "Gerar
// mensalidades" — não mexe nos títulos das empresas em modo manual.
export function SyncAsaasButton() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const res = await syncAsaasCharges();
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast(`${res.n ?? 0} cobrança(s) criada(s) no Asaas.`);
      router.refresh();
    });
  }

  return (
    <button
      onClick={run}
      disabled={pending}
      className="h-10 md:h-9 rounded-lg border px-4 text-sm font-medium transition hover:bg-subtle disabled:opacity-50"
    >
      {pending ? "Sincronizando..." : "Sincronizar cobranças Asaas"}
    </button>
  );
}
