import Link from "next/link";
import { getReceivables, receivableTotals } from "@/modules/recebiveis/queries";
import { ReceiveButton } from "@/modules/recebiveis/receive-button";
import { WhatsAppChargeButton } from "@/modules/recebiveis/whatsapp-charge-button";
import { AsaasChargeButton } from "@/modules/recebiveis/asaas-charge-button";
import { brl } from "@/lib/format";
import type { Receivable } from "@/modules/recebiveis/queries";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageIcon } from "@/components/page-icon";
import { Wallet } from "lucide-react";
import { listRecurringCharges } from "@/modules/recebiveis/recurring-actions";
import { RecurringSection } from "@/modules/recebiveis/recurring-section";
import { quoteFormOptions } from "@/modules/orcamentos/queries";
import { FilterBar } from "@/modules/recebiveis/filter-bar";

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${names[Number(m) - 1]}/${y.slice(2)}`;
}

function isValidPeriod(s?: string) {
  return Boolean(s && /^\d{4}-\d{2}$/.test(s));
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function Item({
  r,
  received,
  showCharge,
  asaasEnabled,
}: {
  r: Receivable;
  received?: boolean;
  showCharge?: boolean;
  asaasEnabled?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="tabular text-sm font-medium">{fmtDate(r.due_date)}</span>
          <span className="truncate text-sm">{r.customer_name ?? "Cliente"}</span>
          {r.quote_number && (
            <span className="text-xs text-muted">#{r.quote_number}</span>
          )}
          <span className="text-xs text-muted">
            {r.number === 0 ? "entrada" : `parcela ${r.number}`}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="tabular text-sm font-medium">{brl(r.amount_cents)}</span>
        {showCharge && (
          <WhatsAppChargeButton
            customerName={r.customer_name ?? "Cliente"}
            whatsapp={r.customer_whatsapp}
            amountCents={r.amount_cents}
            dueDate={r.due_date}
          />
        )}
        {showCharge && asaasEnabled && (
          <AsaasChargeButton installmentId={r.id} invoiceUrl={r.asaas_invoice_url} />
        )}
        <ReceiveButton id={r.id} received={received} />
      </div>
    </li>
  );
}

function Group({
  title,
  items,
  emphasis,
  received,
  showCharge,
  asaasEnabled,
}: {
  title: string;
  items: Receivable[];
  emphasis?: boolean;
  received?: boolean;
  showCharge?: boolean;
  asaasEnabled?: boolean;
}) {
  if (items.length === 0) return null;
  const total = items.reduce((s, r) => s + r.amount_cents, 0);
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {title} <span className="text-muted">({items.length})</span>
        </h2>
        <span className="tabular text-sm text-muted">{brl(total)}</span>
      </div>
      <ul
        className={`divide-y rounded-lg border bg-surface shadow-card ${
          emphasis ? "border-l-2 border-l-danger" : ""
        }`}
      >
        {items.map((r) => (
          <Item key={r.id} r={r} received={received} showCharge={showCharge} asaasEnabled={asaasEnabled} />
        ))}
      </ul>
    </section>
  );
}

export default async function RecebiveisPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; cliente?: string }>;
}) {
  const { mes: mesParam, cliente } = await searchParams;
  const mes = isValidPeriod(mesParam) ? mesParam! : new Date().toISOString().slice(0, 7);
  const customerId = cliente || undefined;

  const [
    { overdue, dueSoon, upcoming, received, asaasEnabled },
    totals,
    recurringCharges,
    { customers },
  ] = await Promise.all([
    getReceivables({ period: mes, customerId }),
    receivableTotals({ period: mes, customerId }),
    listRecurringCharges(),
    quoteFormOptions(),
  ]);

  const hasFilter = Boolean(customerId) || mes !== new Date().toISOString().slice(0, 7);
  const empty = overdue.length + dueSoon.length + upcoming.length + received.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <PageIcon module="orcamentos" icon={Wallet} />
        <h1 className="text-xl font-semibold">Recebíveis</h1>
      </header>

      <FilterBar
        mes={mes}
        clienteId={customerId}
        customers={customers.map((c) => ({ id: c.id, name: c.label ?? c.id }))}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="A receber" value={brl(totals.toReceive)} />
        <StatCard label="Vencido" value={brl(totals.overdue)} danger={totals.overdue > 0} />
        <StatCard label={`Recebido em ${monthLabel(mes)}`} value={brl(totals.receivedInPeriod)} />
      </div>

      {!asaasEnabled && (
        <Link
          href="/configuracoes"
          className="block rounded-lg border border-dashed bg-surface p-3 text-xs text-muted transition hover:bg-subtle"
        >
          Quer cobrar seus clientes automaticamente via Pix/cartão? Configure o Asaas em Configurações →
        </Link>
      )}

      {empty ? (
        <EmptyState message={hasFilter ? "Nenhuma parcela neste período/cliente. Ajuste o filtro acima ou limpe para ver tudo." : "Nenhuma parcela ainda. Ao fechar uma venda parcelada, as parcelas aparecem aqui."} />
      ) : (
        <div className="space-y-6">
          <Group title="Vencidas" items={overdue} emphasis showCharge asaasEnabled={asaasEnabled} />
          <Group title="Vencem em até 7 dias" items={dueSoon} />
          <Group title="A vencer" items={upcoming} />
          {received.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground">
                Recebidas recentemente ({received.length})
              </summary>
              <ul className="mt-2 divide-y rounded-lg border bg-surface">
                {received.map((r) => (
                  <Item key={r.id} r={r} received />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="border-t pt-6">
        <RecurringSection charges={recurringCharges} customers={customers} />
      </div>
    </div>
  );
}
