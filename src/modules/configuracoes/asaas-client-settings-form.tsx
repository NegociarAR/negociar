"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { saveAsaasClientSettings, disableAsaasClientBilling } from "./asaas-client-actions";
import type { AsaasClientSettings } from "./asaas-client-types";

const input = "h-10 w-full rounded-lg border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const label = "mb-1.5 block text-sm font-medium";

// Cobrança automática (Pix/cartão/boleto) para a empresa cobrar os
// PRÓPRIOS clientes dela nos recebíveis. Usa a conta Asaas da própria
// empresa — ela cria a conta no site do Asaas, cola a API key aqui e
// cadastra a URL do webhook abaixo no painel do Asaas dela. O NEGOCIAR
// nunca recebe nem intermedia esse dinheiro.
export function AsaasClientSettingsForm({ settings }: { settings: AsaasClientSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [environment, setEnvironment] = useState(settings.environment);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveAsaasClientSettings({
        apiKey: String(f.get("apiKey") ?? ""),
        environment,
      });
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast("Configuração salva.");
      (e.currentTarget.elements.namedItem("apiKey") as HTMLInputElement).value = "";
      router.refresh();
    });
  }

  function disable() {
    startTransition(async () => {
      const res = await disableAsaasClientBilling();
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Cobrança automática desativada.");
      router.refresh();
    });
  }

  function copyWebhook() {
    navigator.clipboard.writeText(settings.webhookUrl);
    toast("URL do webhook copiada.");
  }

  return (
    <div className="rounded-lg border bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Cobrança automática para seus clientes (Asaas)</h2>
          <p className="mt-1 text-xs text-muted">
            Cobre seus clientes via Pix, cartão ou boleto direto pelos recebíveis. Exige uma conta sua no{" "}
            <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="underline">
              asaas.com
            </a>{" "}
            — o dinheiro cai direto na sua conta, o NEGOCIAR não intermedia.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
            settings.enabled ? "border-success/30 bg-success/10 text-success" : "border-border text-muted"
          }`}
        >
          {settings.enabled ? "Ativo" : "Inativo"}
        </span>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Ambiente</label>
            <select value={environment} onChange={(e) => setEnvironment(e.target.value as typeof environment)} className={input}>
              <option value="sandbox">Sandbox (testes)</option>
              <option value="producao">Produção</option>
            </select>
          </div>
          <div>
            <label className={label}>API key do Asaas</label>
            <input
              name="apiKey"
              type="password"
              placeholder={settings.apiKeyMasked ?? "Cole sua API key"}
              className={input}
            />
          </div>
        </div>

        <div>
          <label className={label}>URL do webhook (cadastre no painel do Asaas, em Integrações → Webhooks)</label>
          <div className="flex gap-2">
            <input readOnly value={settings.webhookUrl} className={`${input} text-muted`} />
            <button type="button" onClick={copyWebhook} className="h-10 shrink-0 rounded-lg border px-3 text-sm font-medium hover:bg-subtle">
              Copiar
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">Eventos a marcar: PAYMENT_RECEIVED e PAYMENT_CONFIRMED.</p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-fg disabled:opacity-50">
            {pending ? "Salvando..." : "Salvar"}
          </button>
          {settings.enabled && (
            <button type="button" onClick={disable} disabled={pending} className="h-10 rounded-lg border px-5 text-sm font-medium hover:bg-subtle disabled:opacity-50">
              Desativar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
