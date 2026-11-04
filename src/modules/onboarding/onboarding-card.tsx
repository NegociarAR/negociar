"use client";

import Link from "next/link";
import { useTransition } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { setIssuesInvoices, dismissOnboarding } from "./actions";
import type { OnboardingProgress } from "./queries";

interface CheckItem {
  id: string;
  label: string;
  done: boolean;
  href?: string;
  linkLabel?: string;
}

function buildItems(p: OnboardingProgress): CheckItem[] {
  const items: CheckItem[] = [
    {
      id: "company",
      label: "Complete os dados da empresa (nome, telefone)",
      done: p.hasCompanyData,
      href: "/configuracoes",
      linkLabel: "Configurações →",
    },
    {
      id: "customer",
      label: "Cadastre pelo menos 1 cliente",
      done: p.hasCustomer,
      href: "/clientes/novo",
      linkLabel: "Novo cliente →",
    },
    {
      id: "product",
      label: "Cadastre pelo menos 1 produto ou serviço",
      done: p.hasProduct,
      href: "/produtos/novo",
      linkLabel: "Novo produto →",
    },
    {
      id: "quote",
      label: "Crie seu primeiro orçamento",
      done: p.hasQuote,
      href: "/orcamentos/novo",
      linkLabel: "Novo orçamento →",
    },
  ];

  if (p.teamModuleEnabled) {
    items.push({
      id: "team",
      label: "Convide alguém da sua equipe",
      done: p.hasTeamInvite,
      href: "/equipe",
      linkLabel: "Equipe →",
    });
  }

  if (p.issuesInvoices === true) {
    items.push({
      id: "fiscal",
      label: "Configure a emissão de notas fiscais (NFS-e)",
      done: p.fiscalConfigured,
      href: "/configuracoes",
      linkLabel: "Configurações →",
    });
  }

  return items;
}

export function OnboardingCard({
  progress,
  hideDismiss,
}: {
  progress: OnboardingProgress;
  hideDismiss?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const items = buildItems(progress);
  const pct = Math.round((progress.completedCount / progress.totalCount) * 100);

  return (
    <div className="rounded-lg border bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Primeiros passos</h2>
          <p className="mt-0.5 text-xs text-muted">
            {progress.completedCount} de {progress.totalCount} concluídos
          </p>
        </div>
        {!hideDismiss && (
          <button
            onClick={() => startTransition(() => dismissOnboarding())}
            disabled={pending}
            className="shrink-0 text-xs text-muted hover:text-foreground disabled:opacity-50"
          >
            Dispensar
          </button>
        )}
      </div>

      {/* barra de progresso */}
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 text-sm">
            {item.done ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" strokeWidth={2} />
            ) : (
              <Circle size={18} className="mt-0.5 shrink-0 text-muted" strokeWidth={1.5} />
            )}
            <span className={`flex-1 leading-snug ${item.done ? "text-muted line-through" : ""}`}>
              {item.label}
            </span>
            {!item.done && item.href && (
              <Link
                href={item.href}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                {item.linkLabel}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {/* pergunta NFS-e */}
      {progress.issuesInvoices === null && (
        <div className="mt-4 rounded-md bg-subtle p-3 text-sm">
          <p className="font-medium">Sua empresa emite nota fiscal de serviço (NFS-e)?</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => startTransition(() => setIssuesInvoices(true))}
              disabled={pending}
              className="rounded-lg border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-subtle disabled:opacity-50"
            >
              Sim
            </button>
            <button
              onClick={() => startTransition(() => setIssuesInvoices(false))}
              disabled={pending}
              className="rounded-lg border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-subtle disabled:opacity-50"
            >
              Ainda não
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
