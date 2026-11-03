"use client";

import { useRouter } from "next/navigation";
import type { CustomerSort } from "./queries";

const SORTS: { key: CustomerSort; label: string }[] = [
  { key: "recent", label: "Contato recente" },
  { key: "forgotten", label: "Mais esquecidos" },
  { key: "priority", label: "Prioridade" },
  { key: "name", label: "Nome A–Z" },
];

export function SortSelect({
  activeSort,
  q,
  f,
  stageFilter,
}: {
  activeSort: CustomerSort;
  q?: string;
  f?: string;
  stageFilter?: string;
}) {
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (f) params.set("f", f);
    if (stageFilter) params.set("etapa", stageFilter);
    params.set("sort", e.target.value);
    router.push(`/clientes?${params.toString()}`);
  }

  return (
    <select
      value={activeSort}
      onChange={onChange}
      className="sm:hidden rounded-lg border bg-surface px-3 py-1.5 text-sm text-foreground"
    >
      {SORTS.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
