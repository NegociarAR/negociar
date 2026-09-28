"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPaid, reopenInvoice, cancelInvoice } from "./billing-actions";
import { parseBRLToCents } from "@/lib/format";
import { todayBRT } from "@/lib/period";

const btn = "h-7 rounded-md border px-2.5 text-xs font-medium transition hover:bg-subtle disabled:opacity-50";

export function InvoiceActions({ id, status, amountCents }: { id: string; status: "open" | "paid" | "canceled"; amountCents: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        const msg = (res as { error: string }).error;
        setError(msg);
        toast(msg, "error");
        return;
      }
      toast(okMsg);
      setPaying(false);
      router.refresh();
    });
  }

  function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = String(f.get("amount") ?? "").trim();
    run(() => markPaid(id, String(f.get("method")), v ? parseBRLToCents(v) : null, String(f.get("date") ?? "") || null), "Pagamento registrado.");
  }

  if (status === "canceled") return null;

  if (status === "paid") {
    return (
      <button className={btn} disabled={pending} onClick={() => confirm("Desfazer a baixa deste título?") && run(() => reopenInvoice(id), "Título reaberto.")}>
        Reabrir
      </button>
    );
  }

  if (paying) {
    return (
      <form onSubmit={pay} className="flex flex-wrap items-center justify-end gap-1.5">
        <select name="method" className="h-7 rounded-md border bg-surface px-1.5 text-xs">
          <option value="pix">Pix</option>
          <option value="boleto">Boleto</option>
          <option value="transferencia">Transferência</option>
          <option value="cartao">Cartão</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="outro">Outro</option>
        </select>
        <input type="date" name="date" defaultValue={todayBRT()} className="h-7 rounded-md border bg-surface px-1.5 text-xs" />
        <input name="amount" inputMode="decimal" placeholder={(amountCents / 100).toFixed(2).replace(".", ",")} className="h-7 w-20 rounded-md border bg-surface px-1.5 text-xs" />
        <button type="submit" disabled={pending} className="h-7 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-fg disabled:opacity-50">Confirmar</button>
        <button type="button" onClick={() => setPaying(false)} className={btn}>x</button>
        {error && <span className="basis-full text-right text-xs text-danger">{error}</span>}
      </form>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button className={btn} disabled={pending} onClick={() => setPaying(true)}>Registrar pagamento</button>
      <button className={`${btn} text-muted`} disabled={pending} onClick={() => confirm("Cancelar este título?") && run(() => cancelInvoice(id), "Título cancelado.")}>Cancelar</button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
