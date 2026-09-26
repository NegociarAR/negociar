import Link from "next/link";
import { Lock } from "lucide-react";

const MODULE_LABELS: Record<string, string> = {
  clientes: "Clientes (ClienteZap)",
  precifica: "Precificação (Precifica)",
  orcamentos: "Orçamentos (OrçaFácil)",
  teams: "Equipe",
};

export function ModuleLocked({ module }: { module: string }) {
  const label = MODULE_LABELS[module] ?? module;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-subtle">
        <Lock size={22} strokeWidth={1.8} className="text-muted" />
      </div>
      <h1 className="text-lg font-semibold">Recurso não incluído no seu plano</h1>
      <p className="mt-2 text-sm text-muted">
        O módulo <strong className="text-foreground">{label}</strong> não faz parte
        do seu plano atual. Faça upgrade para desbloquear e usar este recurso.
      </p>
      <Link
        href="/configuracoes"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-fg transition hover:opacity-90"
      >
        Ver planos
      </Link>
    </div>
  );
}
