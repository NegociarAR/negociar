"use client";

import { useState, useTransition } from "react";
import { brl, parseBRLToCents } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, Field, Input } from "@/components/ui/form";
import {
  createRecurringCharge,
  pauseRecurringCharge,
  resumeRecurringCharge,
  deleteRecurringCharge,
  type RecurringCharge,
} from "./recurring-actions";

interface CustomerOpt {
  id: string;
  label: string;
  status?: string;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function NewChargeForm({
  customers,
  onDone,
}: {
  customers: CustomerOpt[];
  onDone: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    const amountCents = parseBRLToCents(amount);
    const dayNum = parseInt(day, 10);
    if (!customerId) return setError("Selecione um cliente.");
    if (!description.trim()) return setError("Informe a descrição.");
    if (amountCents <= 0) return setError("Informe um valor válido.");
    if (dayNum < 1 || dayNum > 28 || isNaN(dayNum)) return setError("Dia deve ser entre 1 e 28.");

    start(async () => {
      const res = await createRecurringCharge({
        customerId,
        description: description.trim(),
        amountCents,
        dayOfMonth: dayNum,
        startDate: startDate || undefined,
      });
      if (!res.ok) setError(res.error ?? "Erro ao criar.");
      else onDone();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-surface p-4">
      {error && (
        <p className="rounded-lg border-l-2 border-danger bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <Field label="Cliente">
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="w-full rounded-lg border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Selecione...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
              {c.status === "inactive" ? " (inativo)" : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Descrição">
        <Input
          placeholder="Ex.: Mensalidade, Retainer, Suporte..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Valor (R$)">
          <Input
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Dia do mês (1–28)">
          <Input
            type="number"
            min={1}
            max={28}
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </Field>
        <Field label="Data de início (opcional)">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Salvando..." : "Salvar recorrência"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function ChargeRow({ charge }: { charge: RecurringCharge }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    start(async () => {
      const res = charge.active
        ? await pauseRecurringCharge(charge.id)
        : await resumeRecurringCharge(charge.id);
      if (!res.ok) setError(res.error ?? "Erro.");
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteRecurringCharge(charge.id);
      if (!res.ok) setError(res.error ?? "Erro.");
    });
  }

  return (
    <li className={`px-4 py-3 ${!charge.active ? "opacity-55" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{charge.customer_name ?? "Cliente"}</span>
            <span className="text-sm text-muted">{charge.description}</span>
            {!charge.active && (
              <span className="rounded-full border px-2 py-0.5 text-xs text-muted">Pausada</span>
            )}
          </div>
          <p className="text-sm text-muted">
            <span className="tabular font-medium text-foreground">{brl(charge.amount_cents)}</span>
            {" · "}dia {charge.day_of_month} de cada mês
            {" · "}próxima: {fmtDate(charge.next_due_date)}
          </p>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className="text-sm text-muted underline hover:text-foreground disabled:opacity-50"
          >
            {charge.active ? "Pausar" : "Retomar"}
          </button>
          {!charge.last_generated_sale_id && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="text-sm text-danger underline hover:opacity-80 disabled:opacity-50"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function RecurringSection({
  charges,
  customers,
}: {
  charges: RecurringCharge[];
  customers: CustomerOpt[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Cobranças recorrentes</h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm text-primary hover:underline"
          >
            + Nova cobrança recorrente
          </button>
        )}
      </div>

      {showForm && (
        <NewChargeForm
          customers={customers}
          onDone={() => setShowForm(false)}
        />
      )}

      {charges.length === 0 && !showForm ? (
        <EmptyState message="Nenhuma cobrança recorrente. Crie uma para gerar parcelas automaticamente todo mês." />
      ) : charges.length > 0 ? (
        <ul className="divide-y rounded-lg border bg-surface">
          {charges.map((c) => (
            <ChargeRow key={c.id} charge={c} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
