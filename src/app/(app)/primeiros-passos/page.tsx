import { getOnboardingProgress } from "@/modules/onboarding/queries";
import { OnboardingCard } from "@/modules/onboarding/onboarding-card";
import { reopenOnboarding } from "@/modules/onboarding/actions";
import { RefreshOnDone } from "@/modules/onboarding/refresh-on-done";
import { PageIcon } from "@/components/page-icon";
import { CheckCircle2 } from "lucide-react";

export default async function PrimeirosPassosPage() {
  const progress = await getOnboardingProgress();

  if (!progress) return null;

  const allDone = progress.completedCount === progress.totalCount;

  return (
    <div className="space-y-5">
      {allDone && <RefreshOnDone />}
      <header className="flex items-center gap-3">
        <PageIcon module="admin" icon={CheckCircle2} />
        <div>
          <h1 className="text-xl font-semibold">Primeiros passos</h1>
          <p className="text-sm text-muted">
            {allDone
              ? "Tudo configurado! Você está pronto para usar o NEGOCIAR."
              : `${progress.completedCount} de ${progress.totalCount} etapas concluídas`}
          </p>
        </div>
      </header>

      {/* se estava dispensado, mostra aviso e botão reabrir */}
      {progress.dismissed && !allDone && (
        <div className="flex items-center justify-between rounded-lg border bg-surface px-4 py-3 text-sm shadow-card">
          <span className="text-muted">Você dispensou este guia no Dashboard.</span>
          <form action={reopenOnboarding}>
            <button
              type="submit"
              className="text-xs font-medium text-primary hover:underline"
            >
              Mostrar no Dashboard novamente
            </button>
          </form>
        </div>
      )}

      <OnboardingCard progress={progress} hideDismiss />
    </div>
  );
}
