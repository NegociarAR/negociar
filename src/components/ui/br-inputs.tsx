"use client";

import { useState } from "react";
import {
  maskCPF,
  maskCNPJ,
  maskCEP,
  isValidCPF,
  isValidCNPJ,
  isValidCEP,
  onlyDigits,
} from "@/lib/br-validators";

const inputCls =
  "w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

// preenche um input por id, sem sobrescrever o que o usuário já digitou
function fillIfEmpty(id: string, value?: string) {
  if (!value) return;
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el && !el.value) el.value = value;
}
// preenche sempre (usado quando o dado vem de uma consulta oficial)
function fill(id: string, value?: string) {
  if (!value) return;
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el) el.value = value;
}

interface BrasilApiCnpj {
  razao_social?: string;
  nome_fantasia?: string;
  ddd_telefone_1?: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  message?: string; // erro (404)
}

// CPF ou CNPJ conforme a prop kind.
// Para CNPJ, ao completar 14 dígitos válidos, consulta a BrasilAPI e
// preenche razão social, nome fantasia, contato e endereço.
export function DocInput({
  name,
  kind,
  defaultValue,
}: {
  name: string;
  kind: "cpf" | "cnpj";
  defaultValue?: string;
}) {
  const mask = kind === "cpf" ? maskCPF : maskCNPJ;
  const validate = kind === "cpf" ? isValidCPF : isValidCNPJ;
  const [value, setValue] = useState(defaultValue ? mask(defaultValue) : "");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "notfound">("idle");

  const digits = onlyDigits(value);
  const invalid = touched && digits.length > 0 && !validate(value);

  async function lookupCnpj(cnpj: string) {
    setStatus("loading");
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) {
        setStatus("notfound");
        return;
      }
      const d: BrasilApiCnpj = await res.json();
      setStatus("idle");
      fill("legal_name", d.razao_social);
      // nome fantasia: usa razão social como fallback (muitas MEs não têm fantasia)
      fill("trade_name", d.nome_fantasia || d.razao_social);
      fillIfEmpty("phone", d.ddd_telefone_1);
      fillIfEmpty("email", d.email?.toLowerCase());
      fillIfEmpty("city", d.municipio);
      fillIfEmpty("state", d.uf);
      const rua = [d.logradouro, d.numero].filter(Boolean).join(", ");
      fillIfEmpty("address", rua);
      const cep = document.getElementById("zip_code") as HTMLInputElement | null;
      if (cep && !cep.value && d.cep) cep.value = maskCEP(d.cep);
    } catch {
      setStatus("notfound");
    }
  }

  function onChange(raw: string) {
    const masked = mask(raw);
    setValue(masked);
    if (kind === "cnpj") {
      const d = onlyDigits(masked);
      if (d.length === 14 && isValidCNPJ(d)) lookupCnpj(d);
      else setStatus("idle");
    }
  }

  return (
    <div>
      <input
        name={name}
        value={value}
        inputMode="numeric"
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        className={`${inputCls} ${invalid ? "border-danger focus:ring-danger/20" : ""}`}
        placeholder={kind === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
      />
      {invalid && (
        <p className="mt-1 text-xs text-danger">
          {kind === "cpf" ? "CPF" : "CNPJ"} inválido.
        </p>
      )}
      {kind === "cnpj" && status === "loading" && (
        <p className="mt-1 text-xs text-muted">Buscando dados da empresa...</p>
      )}
      {kind === "cnpj" && status === "notfound" && (
        <p className="mt-1 text-xs text-muted">
          CNPJ não encontrado na base pública — preencha manualmente.
        </p>
      )}
    </div>
  );
}

interface ViaCep {
  logradouro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

// CEP com busca automática no ViaCEP ao completar 8 dígitos.
export function CepInput({
  name = "zip_code",
  defaultValue,
}: {
  name?: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ? maskCEP(defaultValue) : "");
  const [status, setStatus] = useState<"idle" | "loading" | "notfound">("idle");

  async function lookup(cep: string) {
    setStatus("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data: ViaCep = await res.json();
      if (data.erro) {
        setStatus("notfound");
        return;
      }
      setStatus("idle");
      fill("address", data.logradouro);
      fill("city", data.localidade);
      fill("state", data.uf);
    } catch {
      setStatus("notfound");
    }
  }

  return (
    <div>
      <input
        id="zip_code"
        name={name}
        value={value}
        inputMode="numeric"
        placeholder="00000-000"
        onChange={(e) => {
          const masked = maskCEP(e.target.value);
          setValue(masked);
          const d = onlyDigits(masked);
          if (isValidCEP(d)) lookup(d);
          else setStatus("idle");
        }}
        className={inputCls}
      />
      {status === "loading" && (
        <p className="mt-1 text-xs text-muted">Buscando endereço...</p>
      )}
      {status === "notfound" && (
        <p className="mt-1 text-xs text-danger">CEP não encontrado.</p>
      )}
    </div>
  );
}
