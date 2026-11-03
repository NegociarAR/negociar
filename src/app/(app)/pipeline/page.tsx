import Link from "next/link";
import { getPipelineBoard } from "@/modules/clientes/pipeline-queries";
import { PipelineBoardView } from "@/modules/clientes/pipeline-board";
import { PageIcon } from "@/components/page-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Kanban } from "lucide-react";

export default async function PipelinePage() {
  const board = await getPipelineBoard();
  const total = Object.values(board).reduce((s, xs) => s + xs.length, 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <PageIcon module="clientes" icon={Kanban} />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Pipeline</h1>
            <p className="text-sm text-muted">
              <span className="hidden sm:inline">Arraste um card para mudar de estágio, ou use o menu ⋯.</span>
              <span className="sm:hidden">Use o menu ⋯ para mudar de estágio.</span>
            </p>
          </div>
        </div>
        <Link href="/clientes" className="shrink-0 text-sm font-medium text-primary hover:underline">
          Ver lista →
        </Link>
      </header>

      {total === 0 ? (
        <EmptyState message="Nenhum contato ainda. Cadastre um lead ou cliente para começar." />
      ) : (
        <PipelineBoardView board={board} />
      )}
    </div>
  );
}
