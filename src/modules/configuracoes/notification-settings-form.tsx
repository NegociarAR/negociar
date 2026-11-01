"use client";

import { useState, useTransition } from "react";
import { saveNotificationSettings } from "./notification-settings-actions";
import { useToast } from "@/components/toast";

export function NotificationSettingsForm({
  settings,
}: {
  settings: { company_id: string; client_due_reminder_enabled: boolean };
}) {
  const [enabled, setEnabled] = useState(settings.client_due_reminder_enabled);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleChange(val: boolean) {
    setEnabled(val);
    startTransition(() =>
      saveNotificationSettings({ client_due_reminder_enabled: val }).then((res) => {
        if (res.ok) toast("Configuração salva.", "success");
        else {
          toast(res.error ?? "Erro ao salvar.", "error");
          setEnabled(!val);
        }
      }),
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold">Notificações automáticas</h2>
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Lembrete de vencimento ao cliente</p>
          <p className="text-xs text-muted">
            Envia um e-mail ao cliente 3 dias antes do vencimento de cada parcela.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          disabled={pending}
          onClick={() => handleChange(!enabled)}
          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${
            enabled ? "bg-primary" : "bg-subtle"
          }`}
        >
          <span
            className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </label>
    </div>
  );
}
