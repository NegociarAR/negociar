"use client";

import { useRouter } from "next/navigation";
import { StatusBadge } from "./status-badge";

interface CompanyRow {
  id: string;
  name: string;
  plan_name: string | null;
  created_at: string;
  status: "pending" | "active" | "suspended";
  billing_exempt?: boolean;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function AdminCompanyRow({ c }: { c: CompanyRow }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(`/admin/empresas/${c.id}`)}
      className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b px-4 py-3 transition last:border-0 hover:bg-subtle sm:table-row sm:p-0"
    >
      <td className="col-start-1 row-start-1 break-words font-medium sm:px-4 sm:py-3">
        {c.name}
        {c.billing_exempt && (
          <span className="ml-2 rounded-full border px-2 py-0.5 text-xs font-normal text-muted">Isenta</span>
        )}
      </td>
      <td className="col-start-1 row-start-2 text-xs text-muted sm:px-4 sm:py-3 sm:text-sm">{c.plan_name ?? "—"}</td>
      <td className="tabular col-start-2 row-start-2 text-right text-xs text-muted sm:px-4 sm:py-3 sm:text-left sm:text-sm">{fmtDate(c.created_at)}</td>
      <td className="col-start-2 row-start-1 justify-self-end sm:px-4 sm:py-3">
        <StatusBadge status={c.status} />
      </td>
    </tr>
  );
}
