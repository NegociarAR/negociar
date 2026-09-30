"use client";

import { useToast } from "@/components/toast";
import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeSale } from "./sale-calc";
import { closeSale } from "./actions";
import { parseBRLToCents, brl } from "@/lib/format";
import { Field, Input, Button } from "@/components/ui/form";

const METHODS = [
  { id: "avista", label: "À vista" },
  { id: "cartao", label: "Cartão" },
  { id: "pix", label: "Pix" },
  { id: "boleto", label: "Boleto" },
  { id: "transferencia", label: "Transferência" },
  { id: "cheque", label: "Cheque" },
  { id: "outro", label: "Outro" },
];
const DOCS = [
  { id: "nenhum", label: "Nenhum" },
  { id: "nota_fiscal", label: "Nota fiscal" },
  { id: "recibo", label: "Recibo" },
  { id: "contrato", label: "Contrato" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function CloseSaleForm({
  quoteId,
  companyId,
  grossCents,
}: {
  quoteId: string;
  companyId: string;
  grossCents: number;
}) {
  const [method, setMethod] = useState("avista");
  const [docType, setDocType] = useState("nenhum");
  const [discPct, setDiscPct] = useState("");
  const [discVal, setDiscVal] = useState("");
  const [down, setDown] = useState("");
  const [installments, setInstallments] = useState("1");
  const [firstDue, setFirstDue] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<"aceite" | "upload">("aceite");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const num = (v: string) => {
    const n = parseFloat((v || "").replace(",", "."));
    return Number.isNaN(n) ? 0 : n;
  };

  const calc = useMemo(
    () =>
      computeSale({
        grossCents,
        discountPercent: num(discPct),
        discountCents: parseBRLToCents(discVal),
        downPaymentCents: parseBRLToCents(down),
        installments: Math.max(1, parseInt(installments || "1", 10)),
        firstDueDate: firstDue,
      }),
    [grossCents, discPct, discVal, down, installments, firstDue],
  );

  function submit() {
    setError(null);
    if (!calc.ok) {
      setError(calc.reason ?? "Verifique os dados.");
      return;
    }
    startTransition(async () => {
      let signedDocUrl: string | null = null;

      // upload da proposta assinada (pdf ou imagem)
      if (signature === "upload") {
        if (!file) {
          setError("Anexe a proposta assinada.");
          return;
        }
        const ext = file.name.split(".").pop() ?? "pdf";
        const path = `${companyId}/${quoteId}.${ext}`;
        const supabase = createClient();
        const { error: upErr } = await supabase.storage
          .from("signed-proposals")
          .upload(path, file, { upsert: true });
        if (upErr) {
          setError("Falha no upload: " + upErr.message);
          return;
        }
        signedDocUrl = path;
      }

      const res = await closeSale({
        quoteId,
        grossCents,
        discountPercent: num(discPct),
        discountCents: parseBRLToCents(discVal),
        downPaymentCents: parseBRLToCents(down),
        installments: Math.max(1, parseInt(installments || "1", 10)),
        firstDueDate: firstDue,
        paymentMethod: method,
        docType,
        signatureKind: signature,
        signedDocUrl,
        notes: notes || null,
      });

      if (res.ok) {
        setDone(true);
        toast("Venda registrada com sucesso.");
      } else {
        setError(res.error ?? "Erro ao fechar venda.");
        toast(res.error ?? "Erro ao fechar venda.", "error");
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-lg border border-l-2 border-l-primary bg-primary-soft p-4 text-sm">
        Venda registrada com sucesso.
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-lg border bg-surface p-4 shadow-card sm:p-5">
      <h2 className="text-sm font-semibold">Fechar venda</h2>

      {/* pagamento */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Forma de pagamento">
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-10 md:h-9 w-full rounded-md border bg-surface px-3 text-sm">
            {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Documento">
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="h-10 md:h-9 w-full rounded-md border bg-surface px-3 text-sm">
            {DOCS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </Field>
      </div>

      {/* negociação */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Desconto (%)">
          <Input value={discPct} onChange={(e) => { setDiscPct(e.target.value); setDiscVal(""); }} inputMode="decimal" placeholder="0" />
        </Field>
        <Field label="Desconto (R$)">
          <Input value={discVal} onChange={(e) => { setDiscVal(e.target.value); setDiscPct(""); }} inputMode="decimal" placeholder="0,00" />
        </Field>
        <Field label="Entrada (R$)">
          <Input value={down} onChange={(e) => setDown(e.target.value)} inputMode="decimal" placeholder="0,00" />
        </Field>
        <Field label="Parcelas">
          <Input value={installments} onChange={(e) => setInstallments(e.target.value)} inputMode="numeric" placeholder="1" />
        </Field>
        <Field label="Vencimento da 1ª">
          <Input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
        </Field>
      </div>

      {/* resumo */}
      {calc.ok ? (
        <div className="rounded-md border bg-subtle p-3 text-sm">
          <div className="flex justify-between"><span className="text-muted">Bruto</span><span className="tabular">{brl(grossCents)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Desconto</span><span className="tabular">- {brl(calc.discountCents)}</span></div>
          <div className="flex justify-between font-semibold"><span>Líquido</span><span className="tabular">{brl(calc.netCents)}</span></div>
          <div className="mt-2 space-y-1 border-t pt-2">
            {calc.rows.map((r) => (
              <div key={r.number} className="flex justify-between text-xs">
                <span className="text-muted">{r.number === 0 ? "Entrada" : `Parcela ${r.number}`} · {new Date(r.dueDate + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                <span className="tabular">{brl(r.amountCents)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm italic text-muted">{calc.reason}</p>
      )}

      {/* assinatura */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Confirmação da venda</span>
        <div className="inline-flex rounded-md border p-0.5">
          {(["aceite", "upload"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSignature(s)}
              className={`rounded px-3 py-2.5 text-sm font-medium md:py-1.5 ${signature === s ? "bg-primary text-primary-fg" : "text-muted"}`}>
              {s === "aceite" ? "Aceite simples" : "Upload assinado"}
            </button>
          ))}
        </div>
        {signature === "upload" && (
          <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:bg-subtle file:px-3 file:py-2.5 file:text-sm md:file:py-1.5" />
        )}
      </div>

      <Field label="Observação">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes da negociação..." />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="button" onClick={submit} disabled={pending || !calc.ok} className="w-full sm:w-auto">
        {pending ? "Registrando..." : "Registrar venda"}
      </Button>
    </div>
  );
}
