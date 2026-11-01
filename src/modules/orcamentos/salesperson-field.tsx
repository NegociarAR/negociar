"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateQuoteSalesperson } from "./actions";
import { useToast } from "@/components/toast";

interface Member {
  userId: string;
  email: string;
}

export function QuoteSalespersonField({
  quoteId,
  salespersonId,
  members,
  canEdit,
}: {
  quoteId: string;
  salespersonId: string | null;
  members: Member[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const currentEmail = members.find((m) => m.userId === salespersonId)?.email ?? null;

  if (!canEdit) {
    return (
      <span className="text-sm text-muted">
        Vendedor: <span className="text-foreground">{currentEmail ?? "—"}</span>
      </span>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="shrink-0 text-muted">Vendedor:</span>
      <select
        defaultValue={salespersonId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const val = e.target.value || null;
          startTransition(() =>
            updateQuoteSalesperson(quoteId, val).then((res) => {
              if (res.ok) {
                toast("Vendedor atualizado.", "success");
                router.refresh();
              } else {
                toast(res.error ?? "Erro ao salvar.", "error");
              }
            }),
          );
        }}
        className="min-w-[140px] rounded border bg-surface px-2 py-1 text-sm disabled:opacity-50"
      >
        <option value="">— Sem vendedor —</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.email}
          </option>
        ))}
      </select>
    </label>
  );
}
