"use client";

import { flash } from "@/components/toast";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuote, editQuote, type ItemInput } from "./actions";
import { parseBRLToCents, brl } from "@/lib/format";
import { parseQty, quoteSubtotalCents, quoteTotalCents } from "./quote-calc";
import { Field, Input, Button } from "@/components/ui/form";

interface ProductOpt {
  id: string;
  name: string;
  current_price_cents: number | null;
  cost_cents: number;
}
interface CustomerOpt {
  id: string;
  label: string;
  status?: string;
}

interface DraftItem {
  key: string;
  product_id: string | null;
  description: string;
  quantity: string;
  unitPrice: string; // texto "0,00"
}

function newItem(): DraftItem {
  return {
    key: Math.random().toString(36).slice(2),
    product_id: null,
    description: "",
    quantity: "1",
    unitPrice: "",
  };
}

export interface QuoteInitial {
  quoteId: string;
  customerId: string;
  discount: string;
  validUntil: string;
  payment: string;
  delivery: string;
  notes: string;
  items: {
    product_id: string | null;
    description: string;
    quantity: string;
    unitPrice: string;
  }[];
  isRevision: boolean; // true se editar vai gerar v+1
}

export function QuoteBuilder({
  customers,
  products,
  initial,
  prefillItem,
}: {
  customers: CustomerOpt[];
  products: ProductOpt[];
  initial?: QuoteInitial;
  prefillItem?: { description: string; unitPrice: string };
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [items, setItems] = useState<DraftItem[]>(
    initial
      ? initial.items.map((i) => ({ key: Math.random().toString(36).slice(2), ...i }))
      : prefillItem
        ? [
            {
              key: Math.random().toString(36).slice(2),
              product_id: null,
              description: prefillItem.description,
              quantity: "1",
              unitPrice: prefillItem.unitPrice,
            },
          ]
        : [newItem()],
  );
  const [discount, setDiscount] = useState(initial?.discount ?? "");
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [payment, setPayment] = useState(initial?.payment ?? "");
  const [delivery, setDelivery] = useState(initial?.delivery ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it)),
    );
  }

  // ao escolher um produto, preenche descrição e preço sugerido
  function pickProduct(key: string, productId: string) {
    if (!productId) {
      updateItem(key, { product_id: null });
      return;
    }
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const price = p.current_price_cents ?? p.cost_cents;
    updateItem(key, {
      product_id: p.id,
      description: p.name,
      unitPrice: (price / 100).toFixed(2).replace(".", ","),
    });
  }

  const subtotal = useMemo(() => quoteSubtotalCents(items), [items]);
  const discountCents = parseBRLToCents(discount);
  const total = useMemo(() => quoteTotalCents(items, discount), [items, discount]);

  function save() {
    setError(null);

    // cliente inativo: confirma antes de prosseguir
    const chosen = customers.find((c) => c.id === customerId);
    if (chosen?.status === "inactive") {
      if (!confirm("Este cliente está inativo. Deseja continuar mesmo assim?")) {
        return;
      }
    }

    const payload = {
      customer_id: customerId,
      items: items.map<ItemInput>((i) => ({
        product_id: i.product_id,
        description: i.description,
        quantity: parseQty(i.quantity),
        unit_price_cents: parseBRLToCents(i.unitPrice),
      })),
      discount_cents: discountCents,
      valid_until: validUntil || null,
      payment_terms: payment || null,
      delivery_terms: delivery || null,
      notes: notes || null,
    };
    startTransition(async () => {
      if (initial) {
        const res = await editQuote(initial.quoteId, payload);
        if (res.ok) {
          flash(initial.isRevision ? "Nova versão do orçamento criada." : "Orçamento atualizado.");
          router.push(`/orcamentos/${res.id}`);
        }
        else setError(res.error ?? "Erro ao salvar.");
      } else {
        const res = await createQuote(payload);
        if (res.ok) {
          flash("Orçamento criado.");
          router.push(`/orcamentos/${res.id}`);
        }
        else setError(res.error ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border-l-2 border-foreground bg-subtle px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {/* cliente */}
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

      {/* itens */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Itens</h2>
          <button
            type="button"
            onClick={() => setItems((p) => [...p, newItem()])}
            className="py-2 text-sm text-foreground underline"
          >
            + Adicionar item
          </button>
        </div>

        {items.map((it) => (
          <div
            key={it.key}
            className="space-y-3 rounded-lg border bg-surface p-4"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <select
                value={it.product_id ?? ""}
                onChange={(e) => pickProduct(it.key, e.target.value)}
                className="rounded-lg border bg-surface px-3 py-2 text-sm"
              >
                <option value="">Item avulso (sem produto)</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setItems((p) => p.filter((x) => x.key !== it.key))
                  }
                  className="justify-self-start py-2 text-sm text-muted underline hover:text-foreground"
                >
                  Remover
                </button>
              )}
            </div>

            <Input
              placeholder="Descrição"
              value={it.description}
              onChange={(e) => updateItem(it.key, { description: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Qtd">
                <Input
                  inputMode="decimal"
                  value={it.quantity}
                  onChange={(e) =>
                    updateItem(it.key, { quantity: e.target.value })
                  }
                />
              </Field>
              <Field label="Preço unit.">
                <Input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={it.unitPrice}
                  onChange={(e) =>
                    updateItem(it.key, { unitPrice: e.target.value })
                  }
                />
              </Field>
              <Field label="Total">
                <div className="tabular flex h-10 items-center whitespace-nowrap px-1 text-sm">
                  {brl(
                    Math.round(
                      parseQty(it.quantity) * parseBRLToCents(it.unitPrice),
                    ),
                  )}
                </div>
              </Field>
            </div>
          </div>
        ))}
      </div>

      {/* condições */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Desconto (R$)">
          <Input
            inputMode="decimal"
            placeholder="0,00"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </Field>
        <Field label="Validade">
          <Input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </Field>
        <Field label="Pagamento">
          <Input
            placeholder="Ex.: 50% entrada, 50% na entrega"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          />
        </Field>
        <Field label="Entrega/prazo">
          <Input
            placeholder="Ex.: 15 dias úteis"
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Observações">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Ex.: condições de atendimento, escopo detalhado, diretrizes..."
              className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </Field>
        </div>
      </div>

      {/* totais + salvar */}
      <div className="sticky bottom-[4.5rem] z-10 flex flex-wrap items-end justify-between gap-3 rounded-lg border bg-surface p-4 shadow-pop md:static md:bottom-auto md:p-5 md:shadow-none">
        <div className="flex-1 space-y-1 text-sm">
          <div className="flex gap-6">
            <span className="text-muted">Subtotal</span>
            <span className="tabular">{brl(subtotal)}</span>
          </div>
          {discountCents > 0 && (
            <div className="flex gap-6">
              <span className="text-muted">Desconto</span>
              <span className="tabular">− {brl(discountCents)}</span>
            </div>
          )}
          <div className="flex gap-6 text-base font-semibold">
            <span>Total</span>
            <span className="tabular">{brl(total)}</span>
          </div>
        </div>
        <Button type="button" onClick={save} disabled={pending} className="w-full sm:w-auto">
          {pending
            ? "Salvando..."
            : initial
              ? initial.isRevision
                ? "Salvar como nova versão"
                : "Salvar alterações"
              : "Salvar orçamento"}
        </Button>
      </div>
    </div>
  );
}
