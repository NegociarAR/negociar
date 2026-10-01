"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFiscalSettings } from "./fiscal-actions";
import { useToast } from "@/components/toast";
import type { FiscalSettings } from "./fiscal-types";

const input = "h-10 w-full rounded-lg border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const label = "mb-1.5 block text-sm font-medium";

// Configuração da emissão de NFS-e (Focus NFe). A empresa precisa ter
// sua própria conta no provedor, com CNPJ e certificado digital
// próprios — isto aqui só guarda a chave de acesso e as regras fiscais.
export function FiscalSettingsForm({ settings }: { settings: FiscalSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [autoIssue, setAutoIssue] = useState(settings.autoIssue);
  const [environment, setEnvironment] = useState(settings.environment);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveFiscalSettings({
        environment: (f.get("environment") as "homologacao" | "producao") ?? "homologacao",
        apiToken: String(f.get("apiToken") ?? ""),
        municipalServiceCode: String(f.get("municipalServiceCode") ?? ""),
        cnaeCode: String(f.get("cnaeCode") ?? ""),
        taxRegime: String(f.get("taxRegime") ?? ""),
        issRate: String(f.get("issRate") ?? ""),
        enabled,
        autoIssue,
      });
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast("Configuração fiscal salva.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border bg-surface p-5 shadow-card">
      <div>
        <h2 className="text-sm font-semibold">Nota fiscal de serviço (NFS-e)</h2>
        <p className="mt-1 text-xs text-muted">
          A partir de 2026 a emissão de NFS-e no padrão nacional é obrigatória para prestadores de
          serviço. Você precisa de uma conta própria na{" "}
          <a href="https://focusnfe.com.br" target="_blank" rel="noreferrer" className="text-primary underline">
            Focus NFe
          </a>{" "}
          (ou provedor equivalente), com seu CNPJ e certificado digital cadastrados lá — o NEGOCIAR só
          usa a chave de acesso que você gerar nessa conta.
        </p>
      </div>

      {environment === "homologacao" && enabled && (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          Ambiente de teste (homologação): as notas emitidas aqui não têm validade fiscal. Mude para
          &quot;Produção&quot; só depois de confirmar que tudo está saindo certo.
        </p>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
        Habilitar emissão de notas fiscais
      </label>

      {enabled && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoIssue} onChange={(e) => setAutoIssue(e.target.checked)} className="h-4 w-4" />
            Emitir automaticamente ao fechar uma venda
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Ambiente</label>
              <select name="environment" value={environment} onChange={(e) => setEnvironment(e.target.value as typeof environment)} className={input}>
                <option value="homologacao">Homologação (testes)</option>
                <option value="producao">Produção</option>
              </select>
            </div>
            <div>
              <label className={label}>Token de acesso (Focus NFe)</label>
              <input
                name="apiToken"
                type="password"
                placeholder={settings.hasToken ? "•••••••• (já salvo — deixe em branco para manter)" : "Cole o token aqui"}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Código de serviço municipal</label>
              <input name="municipalServiceCode" defaultValue={settings.municipalServiceCode ?? ""} placeholder="Ex.: 01.05" className={input} />
            </div>
            <div>
              <label className={label}>CNAE (opcional)</label>
              <input name="cnaeCode" defaultValue={settings.cnaeCode ?? ""} placeholder="Ex.: 6201-5/01" className={input} />
            </div>
            <div>
              <label className={label}>Regime tributário</label>
              <select name="taxRegime" defaultValue={settings.taxRegime ?? ""} className={input}>
                <option value="">Selecione</option>
                <option value="mei">MEI</option>
                <option value="simples_nacional">Simples Nacional</option>
                <option value="lucro_presumido">Lucro Presumido</option>
                <option value="lucro_real">Lucro Real</option>
              </select>
            </div>
            <div>
              <label className={label}>Alíquota ISS (%)</label>
              <input name="issRate" defaultValue={settings.issRate ?? ""} placeholder="Ex.: 5" className={input} />
            </div>
          </div>
        </>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={pending} className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-fg disabled:opacity-50">
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
