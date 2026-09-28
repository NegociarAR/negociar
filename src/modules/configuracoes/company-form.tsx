"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition } from "react";
import { updateCompany } from "./actions";
import { Field, Input, Button } from "@/components/ui/form";
import { DocInput, CepInput } from "@/components/ui/br-inputs";
import type { CompanyData } from "./queries";

export function CompanyForm({ company }: { company: CompanyData }) {
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function action(formData: FormData) {
    setSaved(null);
    startTransition(async () => {
      const res = await updateCompany(formData);
      const m = res.ok ? "Dados da empresa salvos." : res.error ?? "Erro ao salvar.";
      setSaved(m);
      toast(m, res.ok ? "success" : "error");
    });
  }

  return (
    <form action={action} className="space-y-5 rounded-lg border bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold">Dados da empresa</h2>
      <p className="-mt-3 text-xs text-muted">
        Usados no cabeçalho dos orçamentos enviados ao cliente.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nome / Nome fantasia">
            <Input name="name" defaultValue={company.name} required />
          </Field>
        </div>
        <Field label="Razão social">
          <Input name="legal_name" defaultValue={company.legal_name ?? ""} />
        </Field>
        <Field label="CNPJ">
          <DocInput name="cnpj" kind="cnpj" defaultValue={company.cnpj ?? ""} />
        </Field>
        <Field label="E-mail">
          <Input id="email" name="email" type="email" defaultValue={company.email ?? ""} />
        </Field>
        <Field label="Telefone">
          <Input id="phone" name="phone" defaultValue={company.phone ?? ""} />
        </Field>
        <Field label="CEP">
          <CepInput defaultValue={company.zip_code ?? ""} />
        </Field>
        <Field label="Cidade">
          <Input id="city" name="city" defaultValue={company.city ?? ""} />
        </Field>
        <Field label="Estado">
          <Input id="state" name="state" defaultValue={company.state ?? ""} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Endereço">
            <Input id="address" name="address" defaultValue={company.address ?? ""} />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar dados"}
        </Button>
        {saved && <span className="text-sm text-muted">{saved}</span>}
      </div>
    </form>
  );
}
