"use client";

import { useState } from "react";
import { brl } from "@/lib/format";

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

// Cobrança por WhatsApp direto da parcela vencida — mesmo padrão do
// "Recuperar" em Clientes (mensagem pronta, editável, abre o WhatsApp).
// Antes, pra cobrar, era preciso sair de Recebíveis e achar o cliente.
export function WhatsAppChargeButton({
  customerName,
  whatsapp,
  amountCents,
  dueDate,
}: {
  customerName: string;
  whatsapp: string | null;
  amountCents: number;
  dueDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(
    `Olá, ${customerName.split(" ")[0]}! Tudo bem? Passando para lembrar da parcela de ${brl(amountCents)} vencida em ${fmtDate(dueDate)}. Fico à disposição para qualquer dúvida.`,
  );

  if (!whatsapp) return null;

  function send() {
    const phone = whatsapp!.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    setOpen(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium text-primary underline">
        Cobrar
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setOpen(false)}
    >
      <div className="w-full max-w-sm space-y-2 rounded-lg border bg-surface p-4 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium">Cobrar {customerName}</p>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={4}
          className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex gap-2">
          <button onClick={send} className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg">
            Enviar WhatsApp
          </button>
          <button onClick={() => setOpen(false)} className="h-9 rounded-lg border px-4 text-sm">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
