"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { inviteMember, revokeInvite, removeMember, changeRole } from "./actions";
import { ROLE_LABELS, type CompanyRole, type TeamMember, type PendingInvite } from "./types";

const ROLES: CompanyRole[] = ["admin", "vendedor", "financeiro", "gestor"];
const input = "h-10 rounded-lg border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export function TeamManager({
  members,
  invites,
  canManage,
}: {
  members: TeamMember[];
  invites: PendingInvite[];
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyRole>("vendedor");
  const [error, setError] = useState<string | null>(null);

  function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await inviteMember(email, role);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast("Convite enviado.");
      setEmail("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <form onSubmit={submitInvite} className="flex flex-wrap items-end gap-2 rounded-lg border bg-surface p-4 shadow-card">
          <div className="flex-1 min-w-48">
            <label className="mb-1.5 block text-sm font-medium">Convidar por e-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="nome@empresa.com" className={`${input} w-full`} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Papel</label>
            <select value={role} onChange={(e) => setRole(e.target.value as CompanyRole)} className={input}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={pending} className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg disabled:opacity-50">
            {pending ? "Enviando..." : "Convidar"}
          </button>
          {error && <p className="w-full text-sm text-danger">{error}</p>}
        </form>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Membros ({members.length})</h2>
        <ul className="divide-y rounded-lg border bg-surface shadow-card">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 truncate">{m.email}{m.isSelf && <span className="text-muted"> (você)</span>}</span>
              {canManage && m.role !== "owner" ? (
                <div className="flex shrink-0 items-center gap-2">
                  <select
                    defaultValue={m.role}
                    onChange={(e) =>
                      startTransition(async () => {
                        const res = await changeRole(m.userId, e.target.value as CompanyRole);
                        toast(res.ok ? "Papel atualizado." : res.error, res.ok ? "success" : "error");
                        router.refresh();
                      })
                    }
                    className="h-8 rounded-md border bg-surface px-2 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (!confirm(`Remover ${m.email} da equipe?`)) return;
                      startTransition(async () => {
                        const res = await removeMember(m.userId);
                        toast(res.ok ? "Membro removido." : res.error, res.ok ? "success" : "error");
                        router.refresh();
                      });
                    }}
                    className="text-xs text-danger hover:underline"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <span className="shrink-0 text-xs text-muted">{ROLE_LABELS[m.role]}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {canManage && invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Convites pendentes ({invites.length})</h2>
          <ul className="divide-y rounded-lg border bg-surface shadow-card">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 truncate text-muted">{i.email} · {ROLE_LABELS[i.role]}</span>
                <button
                  onClick={() =>
                    startTransition(async () => {
                      await revokeInvite(i.id);
                      toast("Convite cancelado.");
                      router.refresh();
                    })
                  }
                  className="shrink-0 text-xs text-danger hover:underline"
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
