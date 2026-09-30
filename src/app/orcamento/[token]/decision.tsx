"use client";

import { useState, useTransition } from "react";
import { respondPublicQuote } from "./actions";

type Panel = null | "reject" | "negotiate";

export function PublicDecision({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [panel, setPanel] = useState<Panel>(null);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<"approved" | "rejected" | "negotiate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    startTransition(async () => {
      const res = await respondPublicQuote(token, "approved");
      if (res.ok) setResult("approved");
      else setError("Não foi possível registrar. Tente novamente.");
    });
  }

  function submitReason(action: "rejected" | "negotiate") {
    if (reason.trim().length === 0) {
      setError("Por favor, descreva o motivo.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await respondPublicQuote(token, action, reason.trim());
      if (res.ok) setResult(action);
      else setError("Não foi possível registrar. Tente novamente.");
    });
  }

  if (result) {
    const msg =
      result === "approved"
        ? "Orçamento aprovado. Obrigado! Entraremos em contato."
        : result === "negotiate"
          ? "Recebemos seu pedido de negociação. Em breve retornaremos com uma proposta revisada."
          : "Orçamento recusado. Agradecemos o retorno.";
    return (
      <div className="mt-6 rounded-lg border border-l-2 border-l-foreground bg-subtle p-4 text-center text-sm">
        {msg}
      </div>
    );
  }

  // painel de motivo (recusar ou negociar)
  if (panel) {
    const isReject = panel === "reject";
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm font-medium">
          {isReject
            ? "Conte por que está recusando:"
            : "O que você gostaria de negociar?"}
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          placeholder={
            isReject
              ? "Ex.: preço acima do orçado, fechei com outro fornecedor..."
              : "Ex.: consigo fechar se ajustar o prazo/valor, quero rever quantidades..."
          }
          className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => submitReason(isReject ? "rejected" : "negotiate")}
            disabled={pending}
            className="h-11 flex-1 rounded-lg bg-foreground text-sm font-medium text-background disabled:opacity-50"
          >
            {pending ? "Enviando..." : isReject ? "Confirmar recusa" : "Enviar pedido"}
          </button>
          <button
            onClick={() => { setPanel(null); setReason(""); setError(null); }}
            className="h-11 rounded-lg border px-4 text-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // botões iniciais
  return (
    <div className="mt-6 space-y-2">
      <button
        onClick={approve}
        disabled={pending}
        className="h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-fg transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "..." : "Aprovar orçamento"}
      </button>
      <div className="flex gap-2">
        <button
          onClick={() => setPanel("negotiate")}
          className="h-11 flex-1 rounded-lg border text-sm font-medium transition hover:bg-subtle"
        >
          Quero negociar
        </button>
        <button
          onClick={() => setPanel("reject")}
          className="h-11 flex-1 rounded-lg border text-sm font-medium text-muted transition hover:bg-subtle"
        >
          Recusar
        </button>
      </div>
      {error && <p className="text-center text-xs text-danger">{error}</p>}
    </div>
  );
}
