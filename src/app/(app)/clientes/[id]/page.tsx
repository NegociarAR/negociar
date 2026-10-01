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
import { StageControls } from "@/modules/clientes/stage-controls";
import { NextAction } from "@/modules/clientes/next-action";
import { RecoveryAction } from "@/modules/clientes/recovery-action";
import { pendingActionsFor } from "@/modules/clientes/attention";
import { listPeople } from "@/modules/clientes/people";
import { PeopleCard } from "@/modules/clientes/people-card";
import { HistoryPanel } from "@/modules/historico/history-panel";
import { PageIcon } from "@/components/page-icon";
import { Users } from "lucide-react";

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
  const [activities, actions, people] = await Promise.all([
    getCustomerActivities(id),
    pendingActionsFor(id),
    listPeople(id),
  ]);
  const stage = customer.stage ?? "customer";
  const name = customerDisplayName(customer);

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

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PageIcon module="clientes" icon={Users} />
          <h1 className="min-w-0 break-words text-xl font-semibold">
            {customerDisplayName(customer)}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <CustomerStatusSelect customerId={id} status={customer.status} />
          <Link
            href={`/clientes/${id}/editar`}
            className="py-2 text-sm text-primary hover:underline"
          >
            Editar
          </Link>
        </div>
      </header>

      {/* funil comercial + próxima ação */}
      <div className="space-y-5 rounded-lg border bg-surface p-4 sm:p-5">
        <StageControls
          customerId={id}
          stage={stage}
          source={customer.lead_source ?? null}
          estimatedValueCents={customer.estimated_value_cents ?? null}
          lostReason={customer.lost_reason ?? null}
        />
        <div className="border-t pt-4">
          <NextAction customerId={id} actions={actions} />
        </div>
        {(stage === "lead" || stage === "opportunity") && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted">Mensagem pronta no WhatsApp</p>
            <RecoveryAction
              customerId={id}
              customerName={name}
              whatsapp={customer.whatsapp ?? customer.phone}
              defaultMessage={`Olá, ${name.split(" ")[0]}! Tudo bem? Passando para saber se conseguiu avaliar nossa conversa. Fico à disposição para ajudar.`}
              label="Abrir mensagem"
            />
          </div>
        )}
      </div>

      <PeopleCard customerId={id} people={people} />

      <div className="grid gap-6 md:grid-cols-3">
        {/* dados */}
        <div className="md:col-span-2 space-y-3 rounded-lg border bg-surface p-5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-sm">
              <span className="shrink-0 text-muted">{label}</span>
              <span className="min-w-0 break-words text-right">{value ?? "—"}</span>
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

      <HistoryPanel entityIds={[id]} />
    </div>
  );
}
