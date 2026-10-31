"use client";

import { useToast } from "@/components/toast";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSale } from "./actions";

export function CancelSaleButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <button
      onClick={() => {
        if (!confirm("Cancelar esta venda? As parcelas geradas serão apagadas e o orçamento volta a ficar disponível para fechar novamente.")) return;
        startTransition(() =>
          cancelSale(saleId).then((res) => {
            toast(res.ok ? "Venda cancelada." : (res as { error?: string }).error ?? "Não foi possível cancelar.", res.ok ? "success" : "error");
            router.refresh();
          }),
        );
      }}
      disabled={pending}
      className="py-2 text-sm text-danger underline hover:opacity-80 disabled:opacity-50"
    >
      {pending ? "Cancelando..." : "Cancelar venda"}
    </button>
  );
}
