"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { computePrice, computeReverse } from "./calc";
import { SEGMENTS, diagnoseMargin } from "./segments";
import { TAX_PRESETS } from "./tax-presets";
import { savePriceCalculation, saveAsProduct } from "./actions";
import { parseBRLToCents, brl } from "@/lib/format";
import { Field, Input, Button } from "@/components/ui/form";

type Mode = "direct" | "reverse";

const SLICE_SHADE: Record<string, string> = {
  material: "#0a0a0a",
  labor: "#3a3a3a",
  expenses: "#6e6e6e",
  tax: "#9a9a9a",
  commission: "#c2c2c2",
  profit: "#e0e0e0",
};

export function PriceCalculator({
  productId,
  productName: productName_,
  initialCostCents,
}: {
  productId?: string;
  productName?: string;
  initialCostCents?: number;
}) {
  const [mode, setMode] = useState<Mode>("direct");
  const [material, setMaterial] = useState(
    initialCostCents ? (initialCostCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [labor, setLabor] = useState("");
  const [expenses, setExpenses] = useState("");
  const [target, setTarget] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [taxRegime, setTaxRegime] = useState("");
  const [tax, setTax] = useState("");
  const [commission, setCommission] = useState("");
  const [margin, setMargin] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [productName, setProductName] = useState(productName_ ?? "");
  const [showNameInput, setShowNameInput] = useState(false);

  const num = (v: string) => {
    const n = parseFloat((v || "").replace(",", "."));
    return Number.isNaN(n) ? 0 : n;
  };

  const segment = SEGMENTS.find((s) => s.id === segmentId);

  function applySegment(id: string) {
    setSegmentId(id);
    const seg = SEGMENTS.find((s) => s.id === id);
    if (seg && seg.id) {
      if (!tax) setTax(String(seg.tax));
      if (!margin) setMargin(String(seg.margin));
    }
  }

  function applyTaxRegime(id: string) {
    setTaxRegime(id);
    const preset = TAX_PRESETS.find((p) => p.id === id);
    // preenche o % quando o preset tem valor; "manual"/"" deixam o campo livre
    if (preset && preset.percent !== null) {
      setTax(String(preset.percent));
    }
  }

  const materialCents = parseBRLToCents(material);
  const laborCents = parseBRLToCents(labor);

  const direct = useMemo(
    () =>
      computePrice({
        costCents: materialCents + laborCents,
        expensesCents: parseBRLToCents(expenses),
        taxPercent: num(tax),
        commissionPercent: num(commission),
        marginPercent: num(margin),
        materialCents,
        laborCents,
      }),
    [material, labor, expenses, tax, commission, margin],
  );

  const reverse = useMemo(
    () =>
      computeReverse({
        targetPriceCents: parseBRLToCents(target),
        taxPercent: num(tax),
        commissionPercent: num(commission),
        marginPercent: num(margin),
      }),
    [target, tax, commission, margin],
  );

  const diagnosis =
    mode === "direct" && direct.ok && num(margin) > 0
      ? diagnoseMargin(num(margin), segment)
      : null;

  function handleSave() {
    if (!productId || !direct.ok) return;
    setSaved(null);
    startTransition(async () => {
      const res = await savePriceCalculation({
        productId,
        costCents: materialCents + laborCents,
        expensesCents: parseBRLToCents(expenses),
        taxPercent: num(tax),
        commissionPercent: num(commission),
        marginPercent: num(margin),
      });
      setSaved(res.ok ? "Preço salvo no produto." : res.error ?? "Erro ao salvar.");
    });
  }

  // salva a simulação avulsa como novo produto
  function handleSaveAsProduct() {
    if (!direct.ok || !productName.trim()) {
      setSaved("Informe um nome para o produto.");
      return;
    }
    setSaved(null);
    startTransition(async () => {
      const res = await saveAsProduct({
        name: productName,
        costCents: materialCents + laborCents,
        expensesCents: parseBRLToCents(expenses),
        taxPercent: num(tax),
        commissionPercent: num(commission),
        marginPercent: num(margin),
      });
      if (res.ok) {
        setSaved("Produto criado com o preço calculado.");
        setShowNameInput(false);
      } else if (res.error === "limit") {
        setSaved("Limite de produtos do plano atingido.");
      } else {
        setSaved(res.error ?? "Erro ao salvar.");
      }
    });
  }

  // leva ao OrçaFácil com o item já preenchido
  function goToQuote() {
    if (!direct.ok) return;
    const desc = (productName || "Item").trim();
    const preco = (direct.priceCents / 100).toFixed(2).replace(".", ",");
    router.push(
      `/orcamentos/novo?item=${encodeURIComponent(desc)}&preco=${encodeURIComponent(preco)}`,
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-5">
        <div className="inline-flex rounded-lg border p-0.5">
          {(["direct", "reverse"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                mode === m ? "bg-primary text-primary-fg" : "text-muted hover:text-foreground"
              }`}
            >
              {m === "direct" ? "Calcular preço" : "Precificação reversa"}
            </button>
          ))}
        </div>

        {mode === "direct" && (
          <Field label="Segmento">
            <select
              value={segmentId}
              onChange={(e) => applySegment(e.target.value)}
              className="h-9 w-full rounded-lg border bg-surface px-3 text-sm"
            >
              {SEGMENTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {mode === "direct" ? (
            <>
              <Field label="Material (R$)">
                <Input value={material} onChange={(e) => setMaterial(e.target.value)} inputMode="decimal" placeholder="0,00" />
              </Field>
              <Field label="Mão de obra (R$)">
                <Input value={labor} onChange={(e) => setLabor(e.target.value)} inputMode="decimal" placeholder="0,00" />
              </Field>
              <Field label="Despesas (R$)">
                <Input value={expenses} onChange={(e) => setExpenses(e.target.value)} inputMode="decimal" placeholder="0,00" />
              </Field>
            </>
          ) : (
            <div className="sm:col-span-2">
              <Field label="Quero vender por (R$)">
                <Input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="0,00" />
              </Field>
            </div>
          )}
          <div className="sm:col-span-2">
            <Field label="Regime tributário">
              <select
                value={taxRegime}
                onChange={(e) => applyTaxRegime(e.target.value)}
                className="h-9 w-full rounded-lg border bg-surface px-3 text-sm"
              >
                {TAX_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Impostos (%)">
            <Input
              value={tax}
              onChange={(e) => {
                setTax(e.target.value);
                setTaxRegime("manual");
              }}
              inputMode="decimal"
              placeholder="0"
            />
          </Field>
          <Field label="Comissão (%)">
            <Input value={commission} onChange={(e) => setCommission(e.target.value)} inputMode="decimal" placeholder="0" />
          </Field>
          <Field label="Margem desejada (%)">
            <Input value={margin} onChange={(e) => setMargin(e.target.value)} inputMode="decimal" placeholder="0" />
          </Field>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border bg-surface p-5">
        {productName && (
          <p className="text-sm text-muted">
            Produto: <span className="font-medium text-foreground">{productName}</span>
          </p>
        )}

        {mode === "direct" ? (
          direct.ok ? (
            <>
              <Row label="Custo total" value={brl(direct.totalCostCents)} />
              <Row label="Lucro estimado" value={brl(direct.profitCents)} />
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-semibold">Preço sugerido</span>
                <span className="tabular text-xl font-semibold">{brl(direct.priceCents)}</span>
              </div>

              {direct.composition.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex h-3 w-full overflow-hidden rounded-full">
                    {direct.composition.map((s) => (
                      <div
                        key={s.key}
                        style={{ width: `${s.pct}%`, background: SLICE_SHADE[s.key] }}
                        title={`${s.label}: ${brl(s.cents)}`}
                      />
                    ))}
                  </div>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {direct.composition.map((s) => (
                      <li key={s.key} className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: SLICE_SHADE[s.key] }} />
                        <span className="text-muted">{s.label}</span>
                        <span className="tabular ml-auto">{s.pct.toFixed(0)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnosis && (
                <div className={`rounded-lg border-l-2 border-l-primary bg-primary-soft px-3 py-2 text-sm ${diagnosis.level === "good" ? "" : "italic"}`}>
                  {diagnosis.message}
                </div>
              )}

              <div className="space-y-2 pt-1">
                {productId ? (
                  <Button type="button" onClick={handleSave} disabled={pending} className="w-full">
                    {pending ? "Salvando..." : "Salvar preço no produto"}
                  </Button>
                ) : showNameInput ? (
                  <div className="space-y-2">
                    <Input
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Nome do produto"
                    />
                    <div className="flex gap-2">
                      <Button type="button" onClick={handleSaveAsProduct} disabled={pending}>
                        {pending ? "Salvando..." : "Salvar produto"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setShowNameInput(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => setShowNameInput(true)} className="w-full">
                    Salvar como produto
                  </Button>
                )}

                <Button type="button" onClick={goToQuote} className="w-full">
                  Criar orçamento com este item
                </Button>

                {saved && <p className="mt-1 text-center text-xs text-muted">{saved}</p>}
              </div>
            </>
          ) : (
            <p className="text-sm italic text-muted">{direct.reason}</p>
          )
        ) : reverse.ok ? (
          <>
            <Row label="Custo máximo (material + mão de obra + despesas)" value={brl(reverse.maxTotalCostCents)} />
            <Row label="Impostos" value={brl(reverse.taxCents)} />
            <Row label="Comissão" value={brl(reverse.commissionCents)} />
            <div className="flex items-center justify-between border-t pt-3">
              <span className="font-semibold">Lucro embutido</span>
              <span className="tabular text-xl font-semibold">{brl(reverse.profitCents)}</span>
            </div>
            {reverse.maxTotalCostCents < 0 && (
              <p className="text-xs italic text-muted">As taxas consomem todo o preço — não sobra para o custo.</p>
            )}
          </>
        ) : (
          <p className="text-sm italic text-muted">{reverse.reason}</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
