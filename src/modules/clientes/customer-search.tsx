"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

export function CustomerSearch({
  q,
  f,
  etapa,
  sort,
}: {
  q?: string;
  f?: string;
  etapa?: string;
  sort?: string;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      if (f) params.set("f", f);
      if (etapa) params.set("etapa", etapa);
      if (sort) params.set("sort", sort);
      const qs = params.toString();
      router.push(`/clientes${qs ? `?${qs}` : ""}`);
    }, 300);
  }

  return (
    <input
      name="q"
      defaultValue={q ?? ""}
      placeholder="Buscar por nome, telefone, CNPJ..."
      className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      onChange={(e) => handleChange(e.target.value)}
    />
  );
}
