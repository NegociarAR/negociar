"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { saveAppFinancasBrSettings, disableAppFinancasBr } from "./appfinancasbr-actions";
import type { AppFinancasBrSettings } from "./appfinancasbr-queries";

const input = "h-10 w-full rounded-lg border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelCls = "mb-1.5 block text-sm font-medium";

export function AppFinancasBrSettingsForm({ settings }: { settings: AppFinancasBrSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveAppFinancasBrSettings({
        token: String(f.get("token") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast("Configuração salva.");
      (e.currentTarget.elements.namedItem("token") as HTMLInputElement).value = "";
      router.refresh();
    });
  }

  function disable() {
    startTransition(async () => {
      const res = await disableAppFinancasBr();
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Integração desativada.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Integração AppFinançasBr</h2>
          <p className="mt-1 text-xs text-muted">
            Ao marcar uma parcela como recebida, a transação é enviada automaticamente para o{" "}
            <a href="https://appfinancasbr.com" target="_blank" rel="noopener noreferrer" className="underline">
              AppFinançasBr
            </a>
            . Gere o token de integração no painel do AppFinançasBr e cole abaixo.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
            settings.enabled
              ? "border-success/30 bg-success/10 text-success"
              : "border-border text-muted"
          }`}
        >
          {settings.enabled ? "Ativo" : "Inativo"}
        </span>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls}>Token de integração</label>
          <input
            name="token"
            type="password"
            placeholder={settings.tokenMasked ?? "Cole seu token"}
            className={input}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-fg disabled:opacity-50"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
          {settings.enabled && (
            <button
              type="button"
              onClick={disable}
              disabled={pending}
              className="h-10 rounded-lg border px-5 text-sm font-medium hover:bg-subtle disabled:opacity-50"
            >
              Desativar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
