"use client";

import { useRouter } from "next/navigation";
import { QuoteStatusBadge } from "./status-badge";
import { QuoteRowMenu } from "./row-menu";
import { brl } from "@/lib/format";
import type { QuoteListRow } from "./types";

const OPEN_STATUSES = ["sent", "viewed", "negotiation", "negotiation_requested"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function ValidityCell({ validUntil, status }: { validUntil: string | null; status: string }) {
  if (!validUntil) return <span className="text-muted">—</span>;
  const expired = new Date(validUntil) < new Date() && OPEN_STATUSES.includes(status);
  return (
    <span className={expired ? "font-medium text-danger" : "text-muted"}>
      {fmtDate(validUntil)}
      {expired && " ⚠"}
    </span>
  );
}

export function QuoteRow({ qt, companyId, hasFollowup }: { qt: QuoteListRow; companyId: string; hasFollowup?: boolean }) {
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
      <td className="tabular px-4 py-3">
        <ValidityCell validUntil={qt.valid_until} status={qt.status} />
      </td>
      <td className="tabular px-4 py-3">{brl(qt.total_cents)}</td>
      <td className="px-4 py-3">
        <QuoteStatusBadge status={qt.status} />
      </td>
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <QuoteRowMenu
          quoteId={qt.id}
          number={qt.number}
          status={qt.status}
          companyId={companyId}
          totalCents={qt.total_cents}
          customerId={qt.customer_id}
          createdAt={qt.created_at}
          hasFollowup={hasFollowup}
        />
      </td>
    </tr>
  );
}
