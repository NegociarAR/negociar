import Link from "next/link";
import { getCompanyData, getPlanInfo, listPlans, pendingPlanRequest } from "@/modules/configuracoes/queries";
import { CompanyForm } from "@/modules/configuracoes/company-form";
import { LogoUpload } from "@/modules/configuracoes/logo-upload";
import { PlanPicker } from "@/modules/configuracoes/plan-picker";
import { signOut } from "@/app/(auth)/actions";
import { brl } from "@/lib/format";
import { myBilling } from "@/modules/configuracoes/billing";
import { fmtDay } from "@/lib/dates";
import { getFiscalSettings } from "@/modules/configuracoes/fiscal-queries";
import { FiscalSettingsForm } from "@/modules/configuracoes/fiscal-settings-form";
import { PlainSubmitButton } from "@/components/ui/submit-button";

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular">
          {used}{limit !== null ? ` / ${limit}` : " · ilimitado"}
        </span>
      </div>
      {limit !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-subtle">
          <div
            className={`h-full rounded-full ${pct >= 100 ? "bg-danger" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default async function ConfiguracoesPage() {
  const company = await getCompanyData();
  const plan = await getPlanInfo();
  const plans = await listPlans();
  const pending = await pendingPlanRequest();
  const billing = company ? await myBilling(company.id) : null;
  const fiscal = company ? await getFiscalSettings(company.id) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configurações</h1>

      {company && <CompanyForm company={company} />}

      {company && <LogoUpload companyId={company.id} currentUrl={company.logo_url} />}

      {/* Plano e assinatura */}
      {plan && (
        <div className="space-y-4 rounded-lg border bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Plano e assinatura</h2>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              {plan.planName}
            </span>
          </div>

          <div className="flex items-baseline gap-2 text-sm">
            <span className="text-muted">Mensalidade</span>
            <span className="tabular font-medium">
              {plan.priceCents === 0 ? "Grátis" : `${brl(plan.priceCents)}/mês`}
            </span>
            {plan.currentPeriodEnd && (
              <span className="ml-auto text-xs text-muted">
                Vence em {new Date(plan.currentPeriodEnd).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Uso</p>
            <UsageRow label="Clientes" used={plan.usage.customers.used} limit={plan.usage.customers.limit} />
            <UsageRow label="Produtos" used={plan.usage.products.used} limit={plan.usage.products.limit} />
            <UsageRow label="Orçamentos este mês" used={plan.usage.quotesThisMonth.used} limit={plan.usage.quotesThisMonth.limit} />
          </div>

          <div className="border-t pt-4">
            <PlanPicker
              plans={plans as never}
              currentPlanId={plan.planId}
              pending={pending}
            />
          </div>
        </div>
      )}

      {billing && billing.invoices.length > 0 && (
        <div className="space-y-3 rounded-lg border bg-surface p-5 shadow-card">
          <h2 className="text-sm font-semibold">Faturas do NEGOCIAR</h2>
          <ul className="divide-y text-sm">
            {billing.invoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="font-medium">{i.description ?? `Mensalidade ${i.reference_period}`}</span>
                  <span className="text-muted"> · vence {fmtDay(i.due_date)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="tabular">{brl(i.amount_cents)}</span>
                  {i.state === "paid" && <span className="text-xs text-muted">Paga</span>}
                  {i.state === "open" && <span className="rounded-full border px-2 py-0.5 text-xs text-muted">A vencer</span>}
                  {i.state === "overdue" && (
                    <span className="rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-xs text-danger">Atrasada {i.overdue_days}d</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {billing.instructions && billing.invoices.some((i) => i.state !== "paid") && (
            <p className="whitespace-pre-line rounded-md bg-subtle p-3 text-xs text-muted">{billing.instructions}</p>
          )}
        </div>
      )}

      {fiscal && <FiscalSettingsForm settings={fiscal} />}

      <Link
        href="/historico"
        className="flex items-center justify-between rounded-lg border bg-surface p-5 shadow-card transition hover:bg-subtle"
      >
        <div>
          <h2 className="text-sm font-semibold">Histórico de alterações</h2>
          <p className="text-xs text-muted">Quem alterou o quê e quando: clientes, orçamentos, vendas e produtos.</p>
        </div>
        <span className="text-muted">Ver →</span>
      </Link>

      {/* Sair (mobile) */}
      <form action={signOut}>
        <PlainSubmitButton
          pendingText="Saindo..."
          className="h-10 w-full rounded-lg border text-sm font-medium transition hover:bg-subtle md:hidden"
        >
          Sair da conta
        </PlainSubmitButton>
      </form>
    </div>
  );
}
