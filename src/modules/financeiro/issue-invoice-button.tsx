"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { issueServiceInvoiceForSale } from "./invoice-actions";

export function IssueInvoiceButton({ saleId }: { saleId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(() =>
          issueServiceInvoiceForSale(saleId).then((res) => {
            if (res.ok) {
              toast("Nota fiscal enviada para emissão.", "success");
              router.refresh();
            } else {
              toast(res.error, "error");
            }
          }),
        )
      }
      className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-subtle disabled:opacity-50"
    >
      {pending ? "Emitindo..." : "Emitir nota"}
    </button>
  );
}
