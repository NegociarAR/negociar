import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/modules/clientes/queries";
import { updateCustomer } from "@/modules/clientes/actions";
import { CustomerForm } from "@/modules/clientes/customer-form";

export default async function EditarClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const action = updateCustomer.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <BackLink href={`/clientes/${id}`} label="Voltar" />
      <h1 className="text-xl font-semibold">Editar cliente</h1>
      <CustomerForm
        action={action}
        initial={customer}
        submitLabel="Salvar alterações"
        erro={erro}
      />
    </div>
  );
}
