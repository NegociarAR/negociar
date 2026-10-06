"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { brl } from "@/lib/format";
import { todayBRT } from "@/lib/period";
import { useToast } from "@/components/toast";
import { createHourSummary, generateHourlyInvoiceBatch, sendHourSummaryEmail } from "./hourly-actions";
import type { HourEntry } from "./hourly-types";

// Barra fixa de ação quando há lançamentos selecionados (podem cruzar
// vários meses): gerar fatura combinada ou enviar resumo prévio ao
// cliente (e-mail e/ou WhatsApp) para validação, sem bloquear a cobrança.
export function HourBillingBar({
  quoteId,
  customerName,
  customerWhatsapp,
  customerEmail,
  rateCents,
  pendingEntries,
  selected,
  onClear,
}: {
  quoteId: string;
  customerName: string;
  customerWhatsapp: string | null;
  customerEmail: string | null;
  rateCents: number;
  pendingEntries: HourEntry[];
  selected: Set<string>;
  onClear: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<null | "invoice" | "summary">(null);
  const [dueDate, setDueDate] = useState(todayBRT());
  const [summaryUrl, setSummaryUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedEntries = useMemo(
    () => pendingEntries.filter((e) => selected.has(e.id)),
    [pendingEntries, selected],
  );
  const hours = selectedEntries.reduce((s, e) => s + e.hours, 0);
  const total = Math.round(hours * rateCents);

  if (selected.size === 0) return null;

  function invoice() {
    setError(null);
    startTransition(async () => {
      const res = await generateHourlyInvoiceBatch(quoteId, Array.from(selected), dueDate);
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast("Fatura gerada e enviada para Recebíveis.");
      setMode(null);
      onClear();
      router.refresh();
    });
  }

  function sendSummary() {
    setError(null);
    startTransition(async () => {
      const res = await createHourSummary(quoteId, Array.from(selected));
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      setSummaryUrl(`${window.location.origin}/horas-resumo/${res.token}`);
      router.refresh();
    });
  }

  function copyLink() {
    if (!summaryUrl) return;
    navigator.clipboard.writeText(summaryUrl);
    toast("Link copiado.");
  }

  function sendWhatsapp() {
    if (!summaryUrl) return;
    const phone = (customerWhatsapp ?? "").replace(/\D/g, "");
    const text = `Olá, ${customerName.split(" ")[0]}! Segue o resumo das horas lançadas para validação: ${summaryUrl}`;
    const base = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(base, "_blank");
  }

  function sendEmailNow() {
    if (!summaryUrl) return;
    setError(null);
    startTransition(async () => {
      const res = await sendHourSummaryEmail(quoteId, summaryUrl);
      toast(res.ok ? "E-mail enviado." : res.error, res.ok ? "success" : "error");
    });
  }

  return (
    <div className="sticky bottom-4 z-10 rounded-lg border bg-surface p-4 shadow-pop">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{selected.size} lançamento(s) selecionado(s)</p>
          <p className="text-sm text-muted">
            {hours.toFixed(2)}h × {brl(rateCents)} = {brl(total)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setMode("summary");
              setSummaryUrl(null);
            }}
            className="h-10 rounded-lg border px-4 text-sm font-medium hover:bg-subtle"
          >
            Enviar resumo ao cliente
          </button>
          <button onClick={() => setMode("invoice")} className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg hover:opacity-90">
            Gerar fatura
          </button>
          <button onClick={onClear} className="h-10 rounded-lg border px-3 text-sm">
            Limpar
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {mode === "invoice" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          <label className="text-sm text-muted">Vencimento</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-9 rounded-md border bg-surface px-2 text-sm"
          />
          <button onClick={invoice} disabled={pending} className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg disabled:opacity-50">
            {pending ? "Gerando..." : "Confirmar e gerar fatura"}
          </button>
          <button onClick={() => setMode(null)} className="h-9 rounded-lg border px-3 text-sm">
            Cancelar
          </button>
        </div>
      )}

      {mode === "summary" && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {!summaryUrl ? (
            <button onClick={sendSummary} disabled={pending} className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg disabled:opacity-50">
              {pending ? "Gerando..." : "Gerar resumo"}
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={sendWhatsapp} className="h-9 rounded-lg border px-4 text-sm font-medium hover:bg-subtle">
                Enviar por WhatsApp
              </button>
              <button
                onClick={sendEmailNow}
                disabled={!customerEmail || pending}
                className="h-9 rounded-lg border px-4 text-sm font-medium hover:bg-subtle disabled:opacity-50"
              >
                Enviar por e-mail
              </button>
              <button onClick={copyLink} className="h-9 rounded-lg border px-4 text-sm font-medium hover:bg-subtle">
                Copiar link
              </button>
            </div>
          )}
          <p className="text-xs text-muted">
            O envio é só um aviso — a fatura pode ser gerada a qualquer momento, independente da resposta do cliente.
          </p>
        </div>
      )}
    </div>
  );
}
