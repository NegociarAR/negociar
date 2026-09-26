import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import {
  getCustomer,
  getCustomerActivities,
} from "@/modules/clientes/queries";
import { customerDisplayName } from "@/modules/clientes/types";
import { maskCPF, maskCNPJ } from "@/lib/br-validators";
import { CustomerStatusSelect } from "@/modules/clientes/status-select";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  const activities = await getCustomerActivities(id);

  const rows: [string, string | null][] =
    customer.person_type === "pf"
      ? [
          ["CPF", customer.cpf ? maskCPF(customer.cpf) : null],
          ["Telefone", customer.phone],
          ["WhatsApp", customer.whatsapp],
          ["E-mail", customer.email],
          ["Cidade", customer.city],
        ]
      : [
          ["Razão social", customer.legal_name],
          ["CNPJ", customer.cnpj ? maskCNPJ(customer.cnpj) : null],
          ["Contato", customer.contact_name],
          ["Telefone", customer.phone],
          ["WhatsApp", customer.whatsapp],
          ["E-mail", customer.email],
          ["Cidade", customer.city],
        ];

  return (
    <div className="space-y-6">
      <BackLink href="/clientes" label="Voltar para clientes" />

      <header className="flex items-start justify-between">
        <h1 className="text-xl font-semibold">
          {customerDisplayName(customer)}
        </h1>
        <div className="flex items-center gap-4">
          <CustomerStatusSelect customerId={id} status={customer.status} />
          <Link
            href={`/clientes/${id}/editar`}
            className="text-sm text-primary hover:underline"
          >
            Editar
          </Link>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* dados */}
        <div className="md:col-span-2 space-y-3 rounded-lg border bg-surface p-5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted">{label}</span>
              <span>{value ?? "—"}</span>
            </div>
          ))}
          {customer.notes && (
            <div className="border-t pt-3 text-sm">
              <p className="text-muted">Observações</p>
              <p className="mt-1">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* timeline */}
        <div className="space-y-3 rounded-lg border bg-surface p-5">
          <h2 className="text-sm font-semibold">Histórico</h2>
          {activities.length === 0 ? (
            <p className="text-sm text-muted">Sem atividades.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="tabular text-muted">
                    {fmtDate(a.created_at)}
                  </span>
                  <p>{a.title ?? a.type}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
