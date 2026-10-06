"use client";

import { useState } from "react";
import { MonthGroupCard } from "./month-group";
import { HourBillingBar } from "./hour-billing-bar";
import type { MonthGroup } from "./hourly-types";

// Orquestra a seleção de lançamentos (pode cruzar vários meses) e a barra
// de ação (gerar fatura / enviar resumo).
export function HoursWorkspace({
  quoteId,
  months,
  rateCents,
  customerName,
  customerWhatsapp,
  customerEmail,
}: {
  quoteId: string;
  months: MonthGroup[];
  rateCents: number;
  customerName: string;
  customerWhatsapp: string | null;
  customerEmail: string | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pendingEntries = months.flatMap((m) => m.entries).filter((e) => !e.sale_id);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3 pb-24">
      {months.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-surface p-8 text-center text-sm text-muted">
          Nenhuma hora lançada ainda.
        </p>
      ) : (
        months.map((g) => (
          <MonthGroupCard key={g.period} quoteId={quoteId} group={g} selected={selected} onToggle={toggle} />
        ))
      )}
      <HourBillingBar
        quoteId={quoteId}
        customerName={customerName}
        customerWhatsapp={customerWhatsapp}
        customerEmail={customerEmail}
        rateCents={rateCents}
        pendingEntries={pendingEntries}
        selected={selected}
        onClear={() => setSelected(new Set())}
      />
    </div>
  );
}
