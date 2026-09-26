import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { createCustomer } from "@/modules/clientes/actions";
import { CustomerForm } from "@/modules/clientes/customer-form";
import { getEntitlements, checkLimit } from "@/lib/entitlements";
import { countCustomers } from "@/modules/clientes/queries";

export default async function NovoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  // bloqueio preventivo: se já atingiu o limite, nem mostra o form
  const ent = await getEntitlements();
  const used = await countCustomers();
  const gate = checkLimit(ent, "customers", used);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <BackLink href="/clientes" label="Voltar para clientes" />
      <h1 className="text-xl font-semibold">Novo cliente</h1>

      {!gate.allowed ? (
        <div className="rounded-lg border border-l-2 border-l-primary bg-primary-soft p-6 text-center text-sm">
          <p>Você atingiu o limite de {gate.limit} clientes do seu plano.</p>
          <Link
            href="/configuracoes"
            className="mt-2 inline-block font-medium text-foreground underline"
          >
            Fazer upgrade para cadastrar mais
          </Link>
        </div>
      ) : (
        <CustomerForm
          action={createCustomer}
          submitLabel="Salvar cliente"
          erro={erro}
        />
      )}
    </div>
  );
}
