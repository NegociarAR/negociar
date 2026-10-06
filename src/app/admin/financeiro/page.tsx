import Link from "next/link";
import { SyncAsaasButton } from "@/modules/admin/sync-asaas-button";
import { getBillingOverview, type Invoice, type Situation } from "@/modules/admin/billing-queries";
import { BillingTools } from "@/modules/admin/billing-tools";
import { InvoiceActions } from "@/modules/admin/invoice-actions";
import { AccessButton, BlockEligibleButton } from "@/modules/admin/access-actions";
import { brl } from "@/lib/format";
import { fmtDay } from "@/lib/dates";
import { PageIcon } from "@/components/page-icon";
import { Wallet } from "lucide-react";

const TABS: { key: string; label: string; match: (i: Invoice) => boolean }[] = [
  { key: "pendentes", label: "Pendentes", match: (i) => i.state === "open" || i.state === "overdue" },
  { key: "atraso", label: "Em atraso", match: (i) => i.state === "overdue" },
  { key: "aberto", label: "A vencer", match: (i) => i.state === "open" },
  { key: "pagos", label: "Pagos", match: (i) => i.state === "paid" },
  { key: "cancelados", label: "Cancelados", match: (i) => i.state === "canceled" },
  { key: "todos", label: "Todos", match: () => true },
];

const SITUATION: Record<Situation, { label: string; cls: string }> = {
  ok: { label: "Em dia", cls: "text-muted" },
  tolerance: { label: "Atraso (tolerância)", cls: "bg-warning/10 text-warning border-warning/30" },
  eligible: { label: "Elegível a bloqueio", cls: "bg-danger/10 text-danger border-danger/30" },
  blocked: { label: "Bloqueada", cls: "border-foreground text-foreground" },
};

function Card({ label, value, sub, danger }: { label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border bg-surface p-3 shadow-card sm:p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`tabular mt-1 break-words text-lg font-semibold sm:text-xl ${danger ? "text-danger" : ""}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function StateBadge({ i }: { i: Invoice }) {
  if (i.state === "paid") return <span className="text-xs text-muted">Pago{i.paid_at ? ` em ${new Date(i.paid_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : ""}</span>;
  if (i.state === "canceled") return <span className="rounded-full border px-2 py-0.5 text-xs text-muted line-through">Cancelado</span>;
  if (i.state === "overdue") return <span className="rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-xs text-danger">Atrasado {i.overdue_days}d</span>;
  return <span className="rounded-full border px-2 py-0.5 text-xs text-muted">A vencer</span>;
}

export default async function AdminFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; q?: string }>;
}) {
  const { aba, q } = await searchParams;
  const o = await getBillingOverview();
  if (!o) return null;

  if (o.setupNeeded) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Financeiro</h1>
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted">
          A estrutura financeira ainda não existe no banco. Rode as migrations <code>0031_billing.sql</code> e <code>0032_billing_exempt.sql</code> no Supabase.
        </p>
      </div>
    );
  }

  const tab = TABS.find((t) => t.key === aba) ?? TABS[0];
  const needle = (q ?? "").trim().toLowerCase();
  const rows = o.invoices
    .filter((i) => tab.match(i) && (!needle || i.company_name.toLowerCase().includes(needle)))
    .sort((a, b) => (tab.key === "pagos" || tab.key === "todos" ? b.due_date.localeCompare(a.due_date) : a.due_date.localeCompare(b.due_date)));
  const shown = rows.slice(0, 100);

  const eligible = o.access.filter((a) => a.situation === "eligible");
  const attention = o.access.filter((a) => a.situation !== "ok");
  const m = o.metrics;
  const href = (k: string) => `/admin/financeiro?aba=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
          <PageIcon module="admin" icon={Wallet} />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Financeiro</h1>
            <p className="text-sm text-muted">
              Mensalidades das empresas clientes, acesso e bloqueios. Baixa manual.
              {o.exemptCount > 0 && ` ${o.exemptCount} empresa(s) isenta(s) não entram nestas métricas.`}
            </p>
          </div>
        </div>
        <Link
          href="/admin/financeiro/recebimentos"
          className="inline-flex h-10 md:h-9 shrink-0 items-center rounded-lg border px-4 text-sm font-medium transition hover:bg-subtle"
        >
          Ver recebimentos →
        </Link>
      </div>

      {/* métricas */}
      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Card label="Receita recorrente (MRR)" value={brl(m.mrr)} sub={`${m.payingCompanies} empresa(s) pagante(s)`} />
          <Card label="Faturado no mês" value={brl(m.invoicedMonth)} sub={`referência ${o.month}`} />
          <Card label="Recebido no mês" value={brl(m.receivedMonth)} />
          <Card label="A vencer" value={brl(m.openCents)} sub={`${m.openCount} título(s)`} />
          <Card label="Em atraso" value={brl(m.overdueCents)} sub={`${m.overdueCount} título(s) · ${m.overdueCompanies} empresa(s)`} danger={m.overdueCents > 0} />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Card label="Inadimplência" value={`${m.delinquencyPct.toFixed(1)}%`} sub="do valor vencido até hoje" danger={m.delinquencyPct > 10} />
          {o.aging.map((b) => (
            <Card key={b.label} label={`Atraso: ${b.label}`} value={brl(b.cents)} sub={`${b.count} título(s)`} />
          ))}
        </div>
      </section>

      {/* acesso e bloqueios */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Acesso e bloqueios</h2>
            <p className="text-xs text-muted">Tolerância: {o.graceDays} dia(s) após o vencimento. Depois disso a empresa fica elegível a bloqueio.</p>
          </div>
          {eligible.length > 0 && <BlockEligibleButton count={eligible.length} />}
        </div>
        {attention.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-surface p-6 text-center text-sm text-muted">Nenhuma empresa com pendência ou bloqueio.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-surface">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted">
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Plano</th>
                  <th className="px-4 py-3 font-medium">Em atraso</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {attention.map((a) => (
                  <tr key={a.companyId} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/empresas/${a.companyId}`} className="font-medium hover:underline">{a.name}</Link>
                      {a.status === "suspended" && a.suspendedReason !== "billing" && <p className="text-xs text-muted">bloqueio manual</p>}
                    </td>
                    <td className="px-4 py-3 text-muted">{a.planName ?? "—"}</td>
                    <td className="tabular px-4 py-3">
                      {a.overdueCount > 0 ? <>{brl(a.overdueCents)} <span className="text-xs text-muted">· {a.overdueCount} título(s) · até {a.maxOverdueDays}d</span></> : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${SITUATION[a.situation].cls}`}>{SITUATION[a.situation].label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AccessButton companyId={a.companyId} name={a.name} blocked={a.situation === "blocked"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* títulos */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Títulos</h2>
        </div>
       <BillingTools month={o.month} companies={o.companies} graceDays={o.graceDays} instructions={o.paymentInstructions} />
<SyncAsaasButton />

        <div className="flex flex-wrap items-center justify-between gap-2 border-b">
          <div className="flex gap-1 overflow-x-auto text-sm">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={href(t.key)}
                className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 ${tab.key === t.key ? "border-primary font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
              >
                {t.label} <span className="tabular text-xs text-muted">{o.invoices.filter(t.match).length}</span>
              </Link>
            ))}
          </div>
          <form className="w-full pb-2 sm:w-auto">
            <input type="hidden" name="aba" value={tab.key} />
            <input name="q" defaultValue={q ?? ""} placeholder="Buscar empresa..." className="h-10 md:h-8 w-full rounded-md border bg-surface px-2 text-sm outline-none focus:border-primary sm:w-44" />
          </form>
        </div>

        {shown.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-surface p-6 text-center text-sm text-muted">Nenhum título nesta visão.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-surface">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted">
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Referência</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {shown.map((i) => (
                  <tr key={i.id} className="border-b last:border-0 align-middle">
                    <td className="px-4 py-3">
                      <Link href={`/admin/empresas/${i.company_id}`} className="font-medium hover:underline">{i.company_name}</Link>
                      {i.description && <p className="text-xs text-muted">{i.description}</p>}
                    </td>
                    <td className="tabular px-4 py-3 text-muted">{i.reference_period}</td>
                    <td className="tabular px-4 py-3">{fmtDay(i.due_date)}</td>
                    <td className="tabular px-4 py-3">{brl(i.status === "paid" ? (i.paid_amount_cents ?? i.amount_cents) : i.amount_cents)}</td>
                    <td className="px-4 py-3"><StateBadge i={i} /></td>
                    <td className="px-4 py-3"><InvoiceActions id={i.id} status={i.status} amountCents={i.amount_cents} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > shown.length && <p className="text-xs text-muted">Mostrando {shown.length} de {rows.length}. Use a busca para refinar.</p>}
      </section>
    </div>
  );
}
