"use client";

import { useState, useTransition } from "react";
import { requestDemo } from "./actions";

const input =
  "h-11 w-full rounded-lg border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const res = await requestDemo(data);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      form.reset();
    });
  }

  if (done) {
    return (
      <div className="rounded-xl border border-l-2 border-l-primary bg-primary-soft p-6 text-center">
        <p className="font-semibold">Recebemos seu pedido!</p>
        <p className="mt-1 text-sm text-muted">
          Em breve entramos em contato pelo WhatsApp ou e-mail para liberar seu acesso de teste.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-surface p-6 shadow-card sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Nome</label>
          <input name="name" required className={input} placeholder="Seu nome" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">WhatsApp</label>
          <input name="whatsapp" required inputMode="tel" className={input} placeholder="47 99999-0000" />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">E-mail</label>
        <input name="email" type="email" required className={input} placeholder="voce@empresa.com" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Conte um pouco do seu negócio (opcional)</label>
        <textarea name="message" rows={3} className={`${input} h-auto py-2`} placeholder="Ex.: presto consultoria e preciso organizar orçamentos e cobranças" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-lg bg-primary text-sm font-semibold text-primary-fg transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Quero testar grátis"}
      </button>
      <p className="text-center text-xs text-muted">
        Sem cartão de crédito. Respondemos em até 1 dia útil.
      </p>
    </form>
  );
}
