"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeStage, updateLeadInfo } from "./lead-actions";
import { LEAD_SOURCES, STAGE_BADGE, STAGE_LABELS, type Stage } from "./stages";
import { parseBRLToCents, brl } from "@/lib/format";

const btn = "h-8 rounded-md border px-3 text-xs font-medium transition hover:bg-subtle disabled:opacity-50";
const btnPrimary = "h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-fg transition hover:opacity-90 disabled:opacity-50";

// Estágio do contato + ações de funil (oportunidade, converter, perdido, reabrir).
export function StageControls({
  customerId,
  stage,
  source,
  estimatedValueCents,
  lostReason,
}: {
  customerId: string;
  stage: Stage;
  source: string | null;
  estimatedValueCents: number | null;
  lostReason: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function go(next: Stage) {
    let reason: string | undefined;
    if (next === "lost") {
      const r = window.prompt("Motivo da perda (obrigatório):");
      if (!r?.trim()) return;
      reason = r;
    }
    if (next === "customer" && !confirm("Converter este contato em cliente?")) return;
    startTransition(async () => {
      const res = await changeStage(customerId, next, reason);
      setMsg(res.ok ? (next === "customer" ? "Convertido em cliente." : null) : res.error);
      router.refresh();
    });
  }

  function saveInfo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = String(f.get("value") ?? "").trim();
    startTransition(async () => {
      const res = await updateLeadInfo(customerId, String(f.get("source") ?? ""), v ? parseBRLToCents(v) : null);
      setMsg(res.ok ? "Salvo." : res.error);
      router.refresh();
    });
  }

  const open = stage === "lead" || stage === "opportunity";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STAGE_BADGE[stage]}`}>
          {STAGE_LABELS[stage]}
        </span>
        {stage === "lead" && (
          <button className={btn} disabled={pending} onClick={() => go("opportunity")}>Marcar como oportunidade</button>
        )}
        {open && (
          <>
            <button className={btnPrimary} disabled={pending} onClick={() => go("customer")}>Converter em cliente</button>
            <button className={btn} disabled={pending} onClick={() => go("lost")}>Perdido</button>
          </>
        )}
        {stage === "lost" && (
          <button className={btn} disabled={pending} onClick={() => go("lead")}>Reabrir como lead</button>
        )}
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>

      {stage === "lost" && lostReason && (
        <p className="text-sm text-muted">Motivo da perda: {lostReason}</p>
      )}
      {stage === "customer" && (source || estimatedValueCents) && (
        <p className="text-sm text-muted">
          {source && <>Origem: {source}</>}
          {source && estimatedValueCents ? " · " : ""}
          {estimatedValueCents ? <>Potencial: {brl(estimatedValueCents)}</> : null}
        </p>
      )}

      {open && (
        <form onSubmit={saveInfo} className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-xs text-muted">
            Origem
            <select name="source" defaultValue={source ?? ""} className="block h-8 rounded-md border bg-surface px-2 text-sm text-foreground">
              <option value="">—</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted">
            Valor potencial (R$)
            <input
              name="value"
              inputMode="decimal"
              defaultValue={estimatedValueCents ? (estimatedValueCents / 100).toFixed(2).replace(".", ",") : ""}
              className="block h-8 w-32 rounded-md border bg-surface px-2 text-sm text-foreground"
            />
          </label>
          <button type="submit" className={btn} disabled={pending}>Salvar</button>
        </form>
      )}
    </div>
  );
}
