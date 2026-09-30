import Link from "next/link";
import { getPipelineBoard } from "@/modules/clientes/pipeline-queries";
import { PipelineBoardView } from "@/modules/clientes/pipeline-board";

export default async function PipelinePage() {
  const board = await getPipelineBoard();
  const total = Object.values(board).reduce((s, xs) => s + xs.length, 0);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pipeline</h1>
          <p className="text-sm text-muted">Arraste um card para mudar de estágio, ou use o menu ⋯.</p>
        </div>
        <Link href="/clientes" className="text-sm font-medium text-primary hover:underline">
          Ver lista →
        </Link>
      </header>

      {total === 0 ? (
        <p className="rounded-lg border border-dashed bg-surface p-8 text-center text-sm text-muted">
          Nenhum contato ainda. Cadastre um lead ou cliente para começar.
        </p>
      ) : (
        <PipelineBoardView board={board} />
      )}
    </div>
  );
}
