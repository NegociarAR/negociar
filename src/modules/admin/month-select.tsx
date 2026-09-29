"use client";

import { useRouter } from "next/navigation";

export function MonthSelect({
  options,
  value,
  currentMonth,
}: {
  options: string[];
  value: string;
  currentMonth: string;
}) {
  const router = useRouter();
  return (
    <select
      value={value}
      onChange={(e) => router.push(`/admin/financeiro/recebimentos?mes=${e.target.value}`)}
      className="h-9 rounded-lg border bg-surface px-3 text-sm"
    >
      {options.map((m) => (
        <option key={m} value={m}>
          {m === currentMonth ? `${m} (este mês)` : m}
        </option>
      ))}
      <option value="all">Todo o período</option>
    </select>
  );
}
