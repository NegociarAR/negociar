"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshInvoiceStatus } from "./invoice-actions";
import { useToast } from "@/components/toast";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", processing: "Processando", issued: "Emitida", error: "Erro", cancelled: "Cancelada",
};
const STATUS_CLS: Record<string, string> = {
  pending: "text-muted", processing: "text-warning", issued: "text-success", error: "text-danger", cancelled: "text-muted line-through",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  return <span className={`text-xs font-medium ${STATUS_CLS[status] ?? "text-muted"}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function RefreshStatusButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await refreshInvoiceStatus(invoiceId);
          toast(res.ok ? `Status: ${res.status}` : res.error, res.ok ? "success" : "error");
          router.refresh();
        })
      }
      className="text-xs font-medium text-primary underline disabled:opacity-50"
    >
      {pending ? "Consultando..." : "Atualizar status"}
    </button>
  );
}
