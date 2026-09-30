"use client";

import { useToast } from "@/components/toast";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approvePlanRequest, rejectPlanRequest } from "./actions";

export function PlanRequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <div className="flex gap-2">
      <button
        onClick={() => startTransition(() => approvePlanRequest(requestId).then(() => { toast("Solicitação aprovada. O plano da empresa foi alterado."); router.refresh(); }))}
        disabled={pending}
        className="h-10 md:h-8 rounded-md bg-foreground px-3 text-xs font-medium text-background disabled:opacity-50"
      >
        Aprovar
      </button>
      <button
        onClick={() => startTransition(() => rejectPlanRequest(requestId).then(() => { toast("Solicitação rejeitada."); router.refresh(); }))}
        disabled={pending}
        className="h-10 md:h-8 rounded-md border px-3 text-xs font-medium disabled:opacity-50"
      >
        Rejeitar
      </button>
    </div>
  );
}
