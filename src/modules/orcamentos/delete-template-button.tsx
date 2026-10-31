"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTemplate } from "./template-actions";
import { useToast } from "@/components/toast";

export function DeleteTemplateButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="text-muted">Tem certeza?</span>
        <button
          onClick={() =>
            startTransition(() =>
              deleteTemplate(id).then((res) => {
                if (res.ok) {
                  toast("Template excluído.", "success");
                  router.refresh();
                } else {
                  toast(res.error, "error");
                }
                setConfirming(false);
              }),
            )
          }
          disabled={pending}
          className="text-danger underline hover:opacity-80 disabled:opacity-50"
        >
          {pending ? "Excluindo..." : "Confirmar"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-muted underline hover:opacity-80">
          Voltar
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm text-danger underline hover:opacity-80"
    >
      Excluir
    </button>
  );
}
