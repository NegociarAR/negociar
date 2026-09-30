"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateInvoices, createInvoice, saveBillingSettings } from "./billing-actions";
import { parseBRLToCents } from "@/lib/format";

const input = "h-10 md:h-9 w-full rounded-md border bg-surface px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const btn = "h-10 md:h-8 rounded-md border px-3 text-xs font-medium transition hover:bg-subtle disabled:opacity-50";
const btnPrimary = "h-10 md:h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-fg disabled:opacity-50";

type Panel = null | "gen" | "new" | "cfg";

// Ferramentas do financeiro: gerar mensalidades, novo título e configurações.
export function BillingTools({
  month,
  companies,
  graceDays,
  instructions,
}: {
  month: string;
  companies: { id: string; name: string }[];
  graceDays: number;
  instructions: string | null;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function run(fn: () => Promise<{ ok: boolean; error?: string; n?: number }>, okMsg: (n?: number) => string) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      const m = res.ok ? okMsg(res.n) : (res as { error: string }).error;
      setMsg(m);
      toast(m, res.ok ? "success" : "error");
      if (res.ok) router.refresh();
    });
  }

  function gen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(
      () => generateInvoices(String(f.get("period")), Number(f.get("day"))),
      (n) => (n ? `${n} mensalidade(s) gerada(s).` : "Nenhuma nova: todas as empresas já têm título nessa referência."),
    );
  }
  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(
      () => createInvoice({
        companyId: String(f.get("company")),
        description: String(f.get("description") ?? ""),
        amountCents: parseBRLToCents(String(f.get("amount") ?? "")),
        dueDate: String(f.get("due") ?? ""),
      }),
      () => "Título criado.",
    );
  }
  function cfg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(() => saveBillingSettings(Number(f.get("grace")), String(f.get("instructions") ?? "")), () => "Configurações salvas.");
  }

  const tab = (k: Exclude<Panel, null>, label: string) => (
    <button className={`${btn} ${panel === k ? "bg-subtle" : ""}`} onClick={() => { setPanel(panel === k ? null : k); setMsg(null); }}>
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tab("gen", "Gerar mensalidades")}
        {tab("new", "+ Novo título")}
        {tab("cfg", "Tolerância e cobrança")}
      </div>

      {panel === "gen" && (
        <form onSubmit={gen} className="flex flex-wrap items-end gap-3 rounded-lg border bg-subtle p-3">
          <label className="space-y-1 text-xs text-muted">Referência
            <input type="month" name="period" defaultValue={month} required className={input} />
          </label>
          <label className="space-y-1 text-xs text-muted">Dia de vencimento
            <input type="number" name="day" defaultValue={10} min={1} max={31} required className={`${input} w-28`} />
          </label>
          <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Gerando..." : "Gerar"}</button>
          <p className="basis-full text-xs text-muted">Uma mensalidade por empresa ativa com plano pago. Quem já tem título na referência é ignorado.</p>
        </form>
      )}

      {panel === "new" && (
        <form onSubmit={add} className="grid gap-3 rounded-lg border bg-subtle p-3 sm:grid-cols-4">
          <label className="space-y-1 text-xs text-muted sm:col-span-2">Empresa
            <select name="company" required className={input}>
              <option value="">Selecione...</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted">Valor (R$)
            <input name="amount" required inputMode="decimal" placeholder="0,00" className={input} />
          </label>
          <label className="space-y-1 text-xs text-muted">Vencimento
            <input type="date" name="due" required className={input} />
          </label>
          <label className="space-y-1 text-xs text-muted sm:col-span-3">Descrição
            <input name="description" placeholder="Ex.: Mensalidade Pro, setup, ajuste" className={input} />
          </label>
          <div className="flex items-end"><button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Salvando..." : "Criar título"}</button></div>
        </form>
      )}

      {panel === "cfg" && (
        <form onSubmit={cfg} className="grid gap-3 rounded-lg border bg-subtle p-3">
          <label className="space-y-1 text-xs text-muted">Tolerância após o vencimento (dias). Depois disso a empresa fica elegível a bloqueio.
            <input type="number" name="grace" defaultValue={graceDays} min={0} max={60} required className={`${input} w-28`} />
          </label>
          <label className="space-y-1 text-xs text-muted">Instruções de pagamento (aparecem para a empresa: Pix, banco, contato)
            <textarea name="instructions" rows={3} defaultValue={instructions ?? ""} className={`${input} h-auto py-2`} />
          </label>
          <div><button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Salvando..." : "Salvar"}</button></div>
        </form>
      )}

      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
