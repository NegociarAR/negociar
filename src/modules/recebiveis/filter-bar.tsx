"use client";

import { useRouter } from "next/navigation";

type Customer = { id: string; name: string };

export function FilterBar({
  mes,
  clienteId,
  customers,
}: {
  mes: string;
  clienteId?: string;
  customers: Customer[];
}) {
  const router = useRouter();

  function navigate(newMes: string, newCliente?: string) {
    const params = new URLSearchParams();
    params.set("mes", newMes);
    if (newCliente) params.set("cliente", newCliente);
    router.push(`/recebiveis?${params.toString()}`);
  }

  const inputCls = "h-9 rounded-lg border bg-surface px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <input
        type="month"
        value={mes}
        onChange={(e) => navigate(e.target.value, clienteId)}
        className={`${inputCls} w-full sm:w-auto sm:shrink-0`}
      />
      <select
        value={clienteId ?? ""}
        onChange={(e) => navigate(mes, e.target.value || undefined)}
        className={`${inputCls} w-full min-w-0 pr-6 sm:flex-1`}
      >
        <option value="">Todos os clientes</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {(clienteId || mes !== new Date().toISOString().slice(0, 7)) && (
        <a href="/recebiveis" className="text-sm text-muted underline hover:text-foreground">
          Limpar filtros
        </a>
      )}
    </div>
  );
}
