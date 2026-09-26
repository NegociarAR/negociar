"use client";

import { useRouter } from "next/navigation";
import { StatusBadge } from "./status-badge";

interface CompanyRow {
  id: string;
  name: string;
  plan_name: string | null;
  created_at: string;
  status: "pending" | "active" | "suspended";
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
      className="cursor-pointer border-b transition last:border-0 hover:bg-subtle"
    >
      <td className="px-4 py-3 font-medium">{c.name}</td>
      <td className="px-4 py-3 text-muted">{c.plan_name ?? "—"}</td>
      <td className="tabular px-4 py-3 text-muted">{fmtDate(c.created_at)}</td>
      <td className="px-4 py-3">
        <StatusBadge status={c.status} />
      </td>
    </tr>
  );
}
