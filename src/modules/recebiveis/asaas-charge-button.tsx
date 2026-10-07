"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { chargeWithAsaas } from "./actions";

// Salve como: src/modules/recebiveis/asaas-charge-button.tsx
export function AsaasChargeButton({ installmentId, invoiceUrl }: { installmentId: string; invoiceUrl: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  if (invoiceUrl) {
    return (
      <a
        href={invoiceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whitespace-nowrap text-xs font-medium text-primary hover:underline"
      >
        Ver cobrança →
      </a>
    );
  }

  function run() {
    startTransition(async () => {
      const res = await chargeWithAsaas(installmentId);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Cobrança Asaas gerada.");
      router.refresh();
    });
  }

  return (
    <button
      onClick={run}
      disabled={pending}
      className="whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition hover:bg-subtle disabled:opacity-50"
    >
      {pending ? "Gerando..." : "Cobrar via Asaas"}
    </button>
  );
}
