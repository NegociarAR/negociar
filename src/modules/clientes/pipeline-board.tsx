"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { changeStage } from "./lead-actions";
import { STAGE_LABELS, type Stage } from "./stages";
import { brl } from "@/lib/format";
import { useToast } from "@/components/toast";
import type { PipelineBoard as Board, PipelineCard } from "./pipeline-types";

// Fundo bem claro por coluna — ajuda a reconhecer o estágio de relance,
// sem precisar ler o texto. Os cards por cima ficam num tom levemente
// mais claro que o fundo da coluna, pra manter contraste e legibilidade.
const COLUMNS: { key: Stage; accent: string; bg: string; cardBg: string }[] = [
  { key: "lead", accent: "border-t-primary", bg: "bg-primary-soft", cardBg: "bg-surface" },
  { key: "opportunity", accent: "border-t-warning", bg: "bg-warning/[0.06]", cardBg: "bg-surface" },
  { key: "customer", accent: "border-t-success", bg: "bg-success/[0.06]", cardBg: "bg-surface" },
  { key: "lost", accent: "border-t-muted", bg: "bg-subtle", cardBg: "bg-surface" },
];

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// Board de pipeline: arraste um card para outra coluna no desktop, ou use o
// menu "Mover" — que funciona em qualquer dispositivo, inclusive no celular
// (arrastar com o dedo é pouco confiável em drag-and-drop nativo do navegador).
export function PipelineBoardView({ board }: { board: Board }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<Stage | null>(null);

  function move(card: PipelineCard, to: Stage) {
    if (to === card.stage) return;
    let reason: string | undefined;
    if (to === "lost") {
      const r = window.prompt(`Motivo da perda de "${card.name}" (obrigatório):`);
      if (!r?.trim()) return;
      reason = r;
    }
    if (to === "customer" && !window.confirm(`Converter "${card.name}" em cliente?`)) return;

    startTransition(async () => {
      const res = await changeStage(card.id, to, reason);
      toast(res.ok ? `${card.name} movido para ${STAGE_LABELS[to]}.` : res.error, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const cards = board[col.key];
        const totalValue = cards.reduce((s, c) => s + (c.estimatedValueCents ?? 0), 0);
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setOverColumn(col.key);
            }}
            onDragLeave={() => setOverColumn((c) => (c === col.key ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setOverColumn(null);
              const id = e.dataTransfer.getData("text/plain");
              const card = cards.find((c) => c.id === id) ?? Object.values(board).flat().find((c) => c.id === id);
              if (card) move(card, col.key);
            }}
            className={`w-72 shrink-0 rounded-lg border-t-2 shadow-card transition ${col.accent} ${col.bg} ${
              overColumn === col.key ? "ring-2 ring-primary/40" : ""
            }`}
          >
            <div className="border-b px-3 py-2.5">
              <p className="flex items-center justify-between text-sm font-semibold">
                {STAGE_LABELS[col.key]}
                <span className="tabular text-xs font-normal text-muted">{cards.length}</span>
              </p>
              {totalValue > 0 && <p className="text-xs text-muted">{brl(totalValue)}</p>}
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
              {cards.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted">Vazio</p>}
              {cards.map((c) => {
                const idle = col.key !== "customer" && col.key !== "lost" ? daysSince(c.lastContactAt) : null;
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(c.id);
                      e.dataTransfer.setData("text/plain", c.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={`group rounded-md border ${col.cardBg} p-2.5 text-sm shadow-sm transition ${
                      dragId === c.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <Link href={`/clientes/${c.id}`} className="min-w-0 truncate font-medium hover:underline">
                        {c.name}
                      </Link>
                      <MoveMenu card={c} onMove={move} disabled={pending} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      {c.estimatedValueCents ? <span>{brl(c.estimatedValueCents)}</span> : null}
                      {c.leadSource && <span>{c.leadSource}</span>}
                      {idle !== null && idle > 7 && <span className="text-danger">{idle}d sem contato</span>}
                    </div>
                    {col.key === "lost" && c.lostReason && (
                      <p className="mt-1 truncate text-xs text-muted">{c.lostReason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MoveMenu({ card, onMove, disabled }: { card: PipelineCard; onMove: (c: PipelineCard, to: Stage) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const targets = COLUMNS.map((c) => c.key).filter((k) => k !== card.stage);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="rounded px-1.5 py-0.5 text-muted transition hover:bg-subtle hover:text-foreground disabled:opacity-50"
        aria-label="Mover"
      >
        ⋯
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 w-40 rounded-lg border bg-surface py-1 shadow-pop">
            {targets.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setOpen(false);
                  onMove(card, t);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-subtle"
              >
                Mover para {STAGE_LABELS[t]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
