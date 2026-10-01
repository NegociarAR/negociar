"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFiscalSettings, registerFiscalCompany } from "./fiscal-actions";
import { useToast } from "@/components/toast";
import type { FiscalSettings } from "./fiscal-types";

const input = "h-10 w-full rounded-lg border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const label = "mb-1.5 block text-sm font-medium";

const STATUS_INFO: Record<FiscalSettings["onboardingStatus"], { label: string; cls: string }> = {
  not_started: { label: "Não configurado", cls: "border-border text-muted" },
  pending: { label: "Cadastrando...", cls: "border-warning/30 bg-warning/10 text-warning" },
  active: { label: "Ativo — pronto para emitir", cls: "border-success/30 bg-success/10 text-success" },
  error: { label: "Erro no cadastro", cls: "border-danger/30 bg-danger/10 text-danger" },
};

// Configuração da emissão de NFS-e, em parceria com a Focus NFe: o
// próprio NEGOCIAR cadastra a empresa como emitente (não é preciso criar
// conta em outro site) — só falta a empresa informar os dados fiscais e
// enviar o certificado digital A1, que é exigência legal para emissão
// por qualquer sistema integrado via API, independente do provedor.
export function FiscalSettingsForm({ settings }: { settings: FiscalSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [pendingSave, startSave] = useTransition();
  const [pendingCert, startCert] = useTransition();
  const [environment, setEnvironment] = useState(settings.environment);
  const [autoIssue, setAutoIssue] = useState(settings.autoIssue);
  const [error, setError] = useState<string | null>(null);
  const [certError, setCertError] = useState<string | null>(null);

  const dataComplete = Boolean(
    settings.taxRegime && settings.municipalRegistration && settings.municipalServiceCode && settings.address.street && settings.address.ibgeCityCode,
  );

  function submitData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    startSave(async () => {
      const res = await saveFiscalSettings({
        environment,
        municipalServiceCode: String(f.get("municipalServiceCode") ?? ""),
        cnaeCode: String(f.get("cnaeCode") ?? ""),
        taxRegime: String(f.get("taxRegime") ?? ""),
        issRate: String(f.get("issRate") ?? ""),
        municipalRegistration: String(f.get("municipalRegistration") ?? ""),
        street: String(f.get("street") ?? ""),
        number: String(f.get("number") ?? ""),
        complement: String(f.get("complement") ?? ""),
        district: String(f.get("district") ?? ""),
        city: String(f.get("city") ?? ""),
        state: String(f.get("state") ?? ""),
        zipCode: String(f.get("zipCode") ?? ""),
        ibgeCityCode: String(f.get("ibgeCityCode") ?? ""),
        autoIssue,
      });
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast("Dados fiscais salvos.");
      router.refresh();
    });
  }

  function submitCertificate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCertError(null);
    const formData = new FormData(e.currentTarget);
    startCert(async () => {
      const res = await registerFiscalCompany(formData);
      if (!res.ok) {
        setCertError(res.error);
        toast(res.error, "error");
        return;
      }
      toast("Cadastrado na Focus NFe — já pode emitir notas.");
      e.currentTarget.reset();
      router.refresh();
    });
  }

  const st = STATUS_INFO[settings.onboardingStatus];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-surface p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Nota fiscal de serviço (NFS-e)</h2>
            <p className="mt-1 text-xs text-muted">
              A partir de 2026 a emissão de NFS-e no padrão nacional é obrigatória para prestadores de
              serviço. O NEGOCIAR cadastra sua empresa diretamente com a Focus NFe — você só precisa
              preencher os dados abaixo e enviar seu certificado digital.
            </p>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
        </div>

        {settings.onboardingStatus === "error" && settings.onboardingError && (
          <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {settings.onboardingError}
          </p>
        )}

        <form onSubmit={submitData} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Ambiente</label>
              <select value={environment} onChange={(e) => setEnvironment(e.target.value as typeof environment)} className={input}>
                <option value="homologacao">Homologação (testes)</option>
                <option value="producao">Produção</option>
              </select>
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
              <label className={label}>Inscrição municipal</label>
              <input name="municipalRegistration" defaultValue={settings.municipalRegistration ?? ""} className={input} />
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
              <label className={label}>Alíquota ISS (%)</label>
              <input name="issRate" defaultValue={settings.issRate ?? ""} placeholder="Ex.: 5" className={input} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Endereço (usado na nota fiscal)</p>
            <div className="grid gap-3 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label className={label}>Logradouro</label>
                <input name="street" defaultValue={settings.address.street} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Número</label>
                <input name="number" defaultValue={settings.address.number} className={input} />
              </div>
              <div className="sm:col-span-3">
                <label className={label}>Complemento</label>
                <input name="complement" defaultValue={settings.address.complement} className={input} />
              </div>
              <div className="sm:col-span-3">
                <label className={label}>Bairro</label>
                <input name="district" defaultValue={settings.address.district} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Cidade</label>
                <input name="city" defaultValue={settings.address.city} className={input} />
              </div>
              <div className="sm:col-span-1">
                <label className={label}>UF</label>
                <input name="state" maxLength={2} defaultValue={settings.address.state} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>CEP</label>
                <input name="zipCode" defaultValue={settings.address.zipCode} className={input} />
              </div>
              <div className="sm:col-span-3">
                <label className={label}>Código IBGE do município</label>
                <input
                  name="ibgeCityCode"
                  defaultValue={settings.address.ibgeCityCode}
                  placeholder="Ex.: 4202404 (consulte em ibge.gov.br)"
                  className={input}
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoIssue} onChange={(e) => setAutoIssue(e.target.checked)} className="h-4 w-4" />
            Emitir automaticamente ao fechar uma venda
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={pendingSave} className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-fg disabled:opacity-50">
            {pendingSave ? "Salvando..." : "Salvar dados fiscais"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-semibold">Certificado digital (e-CNPJ, modelo A1)</h3>
        <p className="mt-1 text-xs text-muted">
          Exigido por lei para emissão de nota fiscal por qualquer sistema integrado via API. O arquivo e a
          senha são enviados direto para a Focus NFe nesta mesma operação — o NEGOCIAR não guarda nenhum
          dos dois.
        </p>
        <form onSubmit={submitCertificate} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className={label}>Arquivo (.pfx)</label>
            <input type="file" name="certificate" accept=".pfx,.p12" required disabled={!dataComplete} className="text-sm" />
          </div>
          <div>
            <label className={label}>Senha do certificado</label>
            <input type="password" name="certificatePassword" required disabled={!dataComplete} className={input} />
          </div>
          <button
            type="submit"
            disabled={pendingCert || !dataComplete}
            className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-fg disabled:opacity-50"
          >
            {pendingCert ? "Enviando..." : "Cadastrar na Focus NFe"}
          </button>
        </form>
        {!dataComplete && <p className="mt-2 text-xs text-muted">Preencha e salve os dados fiscais acima primeiro.</p>}
        {certError && <p className="mt-2 text-sm text-danger">{certError}</p>}
      </div>
    </div>
  );
}
