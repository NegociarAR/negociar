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
      className="cursor-pointer border-b transition last:border-0 hover:bg-subtle"
    >
      <td className="tabular px-4 py-3 font-medium">
        {qt.number}
        {qt.version > 1 && <span className="text-muted">v{qt.version}</span>}
      </td>
      <td className="px-4 py-3">{qt.customer_name ?? "—"}</td>
      <td className="tabular px-4 py-3 text-muted">{fmtDate(qt.created_at)}</td>
      <td className="tabular px-4 py-3">{brl(qt.total_cents)}</td>
      <td className="px-4 py-3">
        <QuoteStatusBadge status={qt.status} />
      </td>
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <QuoteRowMenu quoteId={qt.id} status={qt.status} />
      </td>
    </tr>
  );
}
