"use client";

import { FlashOnSubmit } from "@/components/toast";
import { useState } from "react";
import { Field, Input, Button } from "@/components/ui/form";
import { DocInput, CepInput } from "@/components/ui/br-inputs";
import type { Customer, PersonType } from "@/modules/clientes/types";

export function CustomerForm({
  action,
  initial,
  submitLabel,
  erro,
}: {
  action: (formData: FormData) => void;
  initial?: Partial<Customer>;
  submitLabel: string;
  erro?: string;
}) {
  const [type, setType] = useState<PersonType>(
    (initial?.person_type as PersonType) ?? "pj",
  );

  return (
    <form action={action} className="space-y-5">
      <FlashOnSubmit message={initial ? "Alterações do cliente salvas." : "Cliente cadastrado."} />
      {erro && (
        <p className="rounded-lg border-l-2 border-foreground bg-subtle px-3 py-2 text-sm">
          {erro}
        </p>
      )}

      {/* seletor PF/PJ */}
      <input type="hidden" name="person_type" value={type} />
      <div className="inline-flex rounded-lg border p-0.5">
        {(["pj", "pf"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              type === t
                ? "bg-primary text-primary-fg"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t === "pj" ? "Pessoa jurídica" : "Pessoa física"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {type === "pf" ? (
          <>
            <Field label="Nome">
              <Input name="name" defaultValue={initial?.name ?? ""} required />
            </Field>
            <Field label="CPF">
              <DocInput name="cpf" kind="cpf" defaultValue={initial?.cpf ?? ""} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Razão social">
              <Input
                id="legal_name"
                name="legal_name"
                defaultValue={initial?.legal_name ?? ""}
              />
            </Field>
            <Field label="Nome fantasia">
              <Input
                id="trade_name"
                name="trade_name"
                defaultValue={initial?.trade_name ?? ""}
                required
              />
            </Field>
            <Field label="CNPJ">
              <DocInput
                name="cnpj"
                kind="cnpj"
                defaultValue={initial?.cnpj ?? ""}
              />
            </Field>
            <Field label="Contato">
              <Input
                name="contact_name"
                defaultValue={initial?.contact_name ?? ""}
              />
            </Field>
          </>
        )}

        <Field label="Telefone">
          <Input id="phone" name="phone" defaultValue={initial?.phone ?? ""} />
        </Field>
        <Field label="WhatsApp">
          <Input name="whatsapp" defaultValue={initial?.whatsapp ?? ""} />
        </Field>
        <Field label="E-mail">
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
          />
        </Field>
        <Field label="CEP">
          <CepInput defaultValue={initial?.zip_code ?? ""} />
        </Field>
        <Field label="Cidade">
          <Input
            id="city"
            name="city"
            defaultValue={initial?.city ?? ""}
          />
        </Field>
        <Field label="Estado">
          <Input
            id="state"
            name="state"
            defaultValue={initial?.state ?? ""}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Endereço">
            <Input
              id="address"
              name="address"
              defaultValue={initial?.address ?? ""}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Observações">
            <Input name="notes" defaultValue={initial?.notes ?? ""} />
          </Field>
        </div>
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
