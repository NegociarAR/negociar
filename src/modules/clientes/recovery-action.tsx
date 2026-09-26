"use client";

import { useState, useTransition } from "react";
import { registerContact } from "./actions";

// Card de recuperação: mostra mensagem pronta (editável) e envia via WhatsApp,
// marcando o cliente como contatado (atualiza last_contact_at).
export function RecoveryAction({
  customerId,
  customerName,
  whatsapp,
  defaultMessage,
}: {
  customerId: string;
  customerName: string;
  whatsapp: string | null;
  defaultMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(defaultMessage);
  const [, startTransition] = useTransition();

  function send() {
    const phone = (whatsapp ?? "").replace(/\D/g, "");
    const text = encodeURIComponent(msg);
    const url = phone
      ? `https://wa.me/55${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
    // marca como contatado
    startTransition(() => registerContact(customerId).then(() => {}));
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-foreground underline"
      >
        Recuperar
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border bg-subtle p-3">
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        rows={3}
        className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div className="flex gap-2">
        <button
          onClick={send}
          className="h-9 rounded-lg bg-foreground px-4 text-sm font-medium text-background"
        >
          Enviar WhatsApp
        </button>
        <button
          onClick={() => setOpen(false)}
          className="h-9 rounded-lg border px-4 text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
