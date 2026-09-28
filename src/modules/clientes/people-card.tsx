"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePerson, makePrimary, deletePerson } from "./people-actions";
import type { Person } from "./people-types";

const inputCls = "h-9 w-full rounded-md border bg-surface px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const btn = "h-8 rounded-md border px-3 text-xs font-medium transition hover:bg-subtle disabled:opacity-50";

function waLink(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (!d) return null;
  return `https://wa.me/${d.length >= 12 && d.startsWith("55") ? d : "55" + d}`;
}

function PersonForm({
  customerId,
  person,
  first,
  onDone,
}: {
  customerId: string;
  person?: Person;
  first: boolean; // primeiro contato: vira principal automaticamente
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await savePerson({
        id: person?.id,
        customerId,
        name: String(f.get("name") ?? ""),
        role: String(f.get("role") ?? ""),
        phone: String(f.get("phone") ?? ""),
        email: String(f.get("email") ?? ""),
        primary: f.get("primary") === "on",
      });
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast(person ? "Contato atualizado." : "Contato adicionado.");
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-subtle p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted">
          Nome *
          <input name="name" required autoFocus defaultValue={person?.name ?? ""} className={inputCls} />
        </label>
        <label className="space-y-1 text-xs text-muted">
          Função (ex.: comprador, financeiro)
          <input name="role" defaultValue={person?.role ?? ""} className={inputCls} />
        </label>
        <label className="space-y-1 text-xs text-muted">
          Telefone / WhatsApp
          <input name="phone" inputMode="tel" defaultValue={person?.phone ?? ""} className={inputCls} />
        </label>
        <label className="space-y-1 text-xs text-muted">
          E-mail
          <input name="email" type="email" defaultValue={person?.email ?? ""} className={inputCls} />
        </label>
      </div>
      {!first && !person?.is_primary && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="primary" /> Definir como contato principal
        </label>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-fg disabled:opacity-50">
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={onDone} className={btn}>Cancelar</button>
      </div>
    </form>
  );
}

// Pessoas de contato da empresa: uma principal e quantas adicionais precisar.
export function PeopleCard({ customerId, people }: { customerId: string; people: Person[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    startTransition(async () => {
      const res = await fn();
      toast(res.ok ? okMsg : (res.error ?? "Não foi possível concluir."), res.ok ? "success" : "error");
      router.refresh();
    });
  }

  function remove(p: Person) {
    const extra = p.is_primary && people.length > 1 ? " Outro contato passará a ser o principal." : "";
    if (!confirm(`Excluir ${p.name}?${extra}`)) return;
    run(() => deletePerson(p.id, customerId), "Contato excluído.");
  }

  return (
    <div className="space-y-3 rounded-lg border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Contatos</h2>
        {!adding && (
          <button className={btn} onClick={() => { setAdding(true); setEditing(null); }}>
            + Adicionar contato
          </button>
        )}
      </div>

      {people.length === 0 && !adding && (
        <p className="text-sm text-muted">Nenhum contato cadastrado. O primeiro será o principal.</p>
      )}

      <ul className="divide-y">
        {people.map((p) =>
          editing === p.id ? (
            <li key={p.id} className="py-3">
              <PersonForm customerId={customerId} person={p} first={false} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 space-y-0.5 text-sm">
                <p className="flex items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  {p.is_primary && (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">Principal</span>
                  )}
                  {p.role && <span className="text-muted">· {p.role}</span>}
                </p>
                <p className="text-muted">
                  {p.phone && (
                    <>
                      {waLink(p.phone) ? (
                        <a href={waLink(p.phone)!} target="_blank" rel="noreferrer" className="underline hover:text-foreground">{p.phone}</a>
                      ) : p.phone}
                    </>
                  )}
                  {p.phone && p.email ? " · " : ""}
                  {p.email && <a href={`mailto:${p.email}`} className="underline hover:text-foreground">{p.email}</a>}
                  {!p.phone && !p.email && "Sem telefone ou e-mail"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {!p.is_primary && (
                  <button disabled={pending} onClick={() => run(() => makePrimary(p.id, customerId), "Contato principal alterado.")} className="font-medium underline disabled:opacity-50">
                    Tornar principal
                  </button>
                )}
                <button onClick={() => { setEditing(p.id); setAdding(false); }} className="text-muted hover:text-foreground">Editar</button>
                <button disabled={pending} onClick={() => remove(p)} className="text-danger disabled:opacity-50">Excluir</button>
              </div>
            </li>
          ),
        )}
      </ul>

      {adding && (
        <PersonForm customerId={customerId} first={people.length === 0} onDone={() => setAdding(false)} />
      )}
    </div>
  );
}
