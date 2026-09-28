"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition } from "react";
import { pdf } from "@react-pdf/renderer";
import { QuotePdf, type QuotePdfData } from "./quote-pdf";
import { sendQuote } from "./actions";

export function QuoteActions({
  quoteId,
  status,
  publicToken,
  pdfData,
  whatsapp,
}: {
  quoteId: string;
  status: string;
  publicToken: string;
  pdfData: QuotePdfData;
  whatsapp: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [days, setDays] = useState(3);

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/orcamento/${publicToken}`
      : "";

  async function downloadPdf() {
    const logoAbsUrl =
      typeof window !== "undefined" ? `${window.location.origin}/brand/n.png` : undefined;
    const blob = await pdf(<QuotePdf data={pdfData} logoAbsUrl={logoAbsUrl} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orcamento-${pdfData.number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    toast("Link do orçamento copiado.");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openWhatsapp() {
    const phone = (whatsapp ?? "").replace(/\D/g, "");
    // Rascunho: mensagem de envio. Já enviado/visualizado: cobrança de retorno.
    const text =
      status === "sent" || status === "viewed"
        ? `Olá! Passando para saber se conseguiu avaliar o orçamento #${pdfData.number}: ${publicUrl}`
        : `Olá! Segue seu orçamento #${pdfData.number}: ${publicUrl}`;
    const msg = encodeURIComponent(text);
    const base = phone
      ? `https://wa.me/55${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(base, "_blank");
  }

  // rótulo do botão conforme o momento
  const waLabel =
    status === "sent" || status === "viewed" ? "Cobrar retorno" : "Enviar por WhatsApp";

  const btn =
    "h-9 rounded-lg border px-4 text-sm font-medium transition hover:bg-subtle";
  const btnPrimary =
    "h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg transition hover:opacity-90";

  return (
    <div className="space-y-3">
      {status === "draft" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-subtle p-3">
          <button
            onClick={() =>
              startTransition(() => sendQuote(quoteId, days).then(() => { toast("Orçamento marcado como enviado."); }))
            }
            disabled={pending}
            className={btnPrimary}
          >
            {pending ? "Enviando..." : "Marcar como enviado"}
          </button>
          <span className="text-sm text-muted">e lembrar de retornar em</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 rounded-lg border bg-surface px-2 text-sm"
          >
            <option value={0}>sem lembrete</option>
            <option value={2}>2 dias</option>
            <option value={3}>3 dias</option>
            <option value={5}>5 dias</option>
            <option value={7}>7 dias</option>
          </select>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={openWhatsapp} className={btn}>
          {waLabel}
        </button>
        <button onClick={copyLink} className={btn}>
          {copied ? "Link copiado!" : "Copiar link"}
        </button>
        <button onClick={downloadPdf} className={btn}>
          Baixar PDF
        </button>
      </div>
    </div>
  );
}
