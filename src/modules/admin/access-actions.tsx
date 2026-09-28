"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockCompany, unblockCompany, blockEligible } from "./billing-actions";

const btn = "h-7 rounded-md border px-2.5 text-xs font-medium transition hover:bg-subtle disabled:opacity-50";

export function AccessButton({ companyId, name, blocked }: { companyId: string; name: string; blocked: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className={blocked ? btn : `${btn} border-danger/40 text-danger`}
      disabled={pending}
      onClick={() => {
        const q = blocked ? `Reativar o acesso de ${name}?` : `Bloquear o acesso de ${name}? Os usuários serão levados à tela de acesso suspenso.`;
        if (!confirm(q)) return;
        startTransition(async () => {
          await (blocked ? unblockCompany(companyId) : blockCompany(companyId));
          router.refresh();
        });
      }}
    >
      {blocked ? "Reativar" : "Bloquear"}
    </button>
  );
}

export function BlockEligibleButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-3">
      <button
        className="h-8 rounded-md bg-danger px-3 text-xs font-medium text-white disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Bloquear ${count} empresa(s) com título em atraso além da tolerância?`)) return;
          startTransition(async () => {
            const res = await blockEligible();
            setMsg(res.ok ? `${res.n ?? 0} empresa(s) bloqueada(s).` : res.error);
            router.refresh();
          });
        }}
      >
        {pending ? "Bloqueando..." : `Bloquear elegíveis (${count})`}
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
