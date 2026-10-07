import Link from "next/link";
import { getReceivables, receivableTotals } from "@/modules/recebiveis/queries";
import { ReceiveButton } from "@/modules/recebiveis/receive-button";
import { WhatsAppChargeButton } from "@/modules/recebiveis/whatsapp-charge-button";
import { AsaasChargeButton } from "@/modules/recebiveis/asaas-charge-button";
import { brl } from "@/lib/format";
import type { Receivable } from "@/modules/recebiveis/queries";

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

function TotalCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border bg-surface p-4 shadow-card">
      <p className="text-sm text-muted">{label}</p>
      <p className={`tabular mt-1 text-xl font-semibold ${danger ? "text-danger" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export default async function RecebiveisPage() {
  const { overdue, dueSoon, upcoming, received, asaasEnabled } = await getReceivables();
  const totals = await receivableTotals();

  const empty =
    overdue.length + dueSoon.length + upcoming.length + received.length === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Recebíveis</h1>

      <div className="grid grid-cols-3 gap-3">
        <TotalCard label="A receber" value={brl(totals.toReceive)} />
        <TotalCard label="Vencido" value={brl(totals.overdue)} danger={totals.overdue > 0} />
        <TotalCard label="Recebido no mês" value={brl(totals.receivedThisMonth)} />
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
        <div className="rounded-lg border border-dashed bg-surface p-10 text-center text-sm text-muted">
          Nenhuma parcela ainda. Ao fechar uma venda parcelada, as parcelas
          aparecem aqui.
        </div>
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
    </div>
  );
}
