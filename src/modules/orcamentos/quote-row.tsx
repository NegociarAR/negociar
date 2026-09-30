"use client";

import { useRouter } from "next/navigation";
import { QuoteStatusBadge } from "./status-badge";
import { QuoteRowMenu } from "./row-menu";
import { brl } from "@/lib/format";
import type { QuoteListRow } from "./types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function QuoteRow({ qt }: { qt: QuoteListRow }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(`/orcamentos/${qt.id}`)}
      className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1 border-b px-4 py-3 transition last:border-0 hover:bg-subtle sm:table-row sm:p-0"
    >
      <td className="tabular col-start-1 row-start-1 font-medium sm:px-4 sm:py-3">
        {qt.number}
        {qt.version > 1 && <span className="text-muted">v{qt.version}</span>}
      </td>
      <td className="col-start-2 row-start-1 truncate sm:px-4 sm:py-3">{qt.customer_name ?? "—"}</td>
      <td className="tabular col-span-2 col-start-1 row-start-2 text-xs text-muted sm:px-4 sm:py-3 sm:text-sm">{fmtDate(qt.created_at)}</td>
      <td className="tabular col-start-3 row-start-1 text-right sm:px-4 sm:py-3 sm:text-left">{brl(qt.total_cents)}</td>
      <td className="col-start-3 row-start-2 justify-self-end sm:px-4 sm:py-3">
        <QuoteStatusBadge status={qt.status} />
      </td>
      <td className="col-start-4 row-span-2 row-start-1 text-right sm:px-4 sm:py-3" onClick={(e) => e.stopPropagation()}>
        <QuoteRowMenu quoteId={qt.id} status={qt.status} />
      </td>
    </tr>
  );
}
