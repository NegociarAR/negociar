"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition } from "react";
import { requestPlanChange } from "./actions";
import { brl } from "@/lib/format";

interface Plan {
  id: string;
  name: string;
  price_cents: number;
  modules: Record<string, boolean>;
}

export function PlanPicker({
  plans,
  currentPlanId,
  pending,
}: {
  plans: Plan[];
  currentPlanId: string;
  pending: { planName: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const [result, setResult] = useState<string | null>(null);

  if (pending) {
    return (
      <div className="rounded-lg border border-l-2 border-l-primary bg-primary-soft p-3 text-sm">
        Solicitação pendente para o plano <strong>{pending.planName}</strong>. Nossa
        equipe irá processar em breve.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-primary hover:underline"
      >
        Ver planos e solicitar mudança
      </button>
    );
  }

  function request(planId: string) {
    setResult(null);
    startTransition(async () => {
      const res = await requestPlanChange(planId);
      const m = res.ok ? "Solicitação enviada! Em breve entraremos em contato." : res.error ?? "Erro.";
      setResult(m);
      toast(m, res.ok ? "success" : "error");
      if (res.ok) setOpen(false);
    });
  }

  const moduleList = (m: Record<string, boolean>) =>
    Object.entries(m).filter(([, v]) => v).map(([k]) => k).join(" · ");

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {plans.map((p) => {
          const current = p.id === currentPlanId;
          return (
            <div
              key={p.id}
              className={`rounded-lg border p-4 ${current ? "border-primary bg-primary-soft" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.name}</span>
                <span className="tabular text-sm">
                  {p.price_cents === 0 ? "Grátis" : `${brl(p.price_cents)}/mês`}
                </span>
              </div>
              <p className="mt-1 text-xs capitalize text-muted">{moduleList(p.modules)}</p>
              {current ? (
                <p className="mt-2 text-xs font-medium text-primary">Plano atual</p>
              ) : (
                <button
                  onClick={() => request(p.id)}
                  disabled={busy}
                  className="mt-2 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Solicitar este plano
                </button>
              )}
            </div>
          );
        })}
      </div>
      {result && <p className="text-sm text-muted">{result}</p>}
      <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-foreground">
        Fechar
      </button>
    </div>
  );
}
