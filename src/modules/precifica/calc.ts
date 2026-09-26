// Precificação por markup divisor. Tudo em centavos (inteiros) para dinheiro
// e pontos percentuais (ex.: 10 = 10%) para taxas.
//
// Direto: dado custo, despesas e taxas (imposto, comissão, margem),
//   preço = (custo + despesas) / (1 - (imposto + comissao + margem)/100)
// Imposto, comissão e margem incidem sobre o PREÇO de venda (padrão real).

export interface PriceInput {
  costCents: number;
  expensesCents: number;
  taxPercent: number;
  commissionPercent: number;
  marginPercent: number;
  // opcionais: separação do custo para a barra de composição
  materialCents?: number;
  laborCents?: number;
}

// Fatia da composição do preço (para a barra visual).
export interface PriceSlice {
  key: "material" | "labor" | "expenses" | "tax" | "commission" | "profit";
  label: string;
  cents: number;
  pct: number; // % do preço final
}

export interface PriceResult {
  ok: boolean;
  reason?: string;
  priceCents: number;
  profitCents: number;
  marginPercent: number; // margem efetiva sobre o preço
  totalCostCents: number; // custo + despesas
  composition: PriceSlice[]; // fatias que somam o preço
}

const round = (n: number) => Math.round(n);

export function computePrice(input: PriceInput): PriceResult {
  const {
    costCents,
    expensesCents,
    taxPercent,
    commissionPercent,
    marginPercent,
    materialCents,
    laborCents,
  } = input;
  const totalCost = costCents + expensesCents;
  const rate = (taxPercent + commissionPercent + marginPercent) / 100;

  if (rate >= 1) {
    return {
      ok: false,
      reason: "A soma de imposto, comissão e margem deve ser menor que 100%.",
      priceCents: 0,
      profitCents: 0,
      marginPercent: 0,
      totalCostCents: totalCost,
      composition: [],
    };
  }

  const price = totalCost / (1 - rate);
  const priceCents = round(price);
  const profitCents = round(priceCents * (marginPercent / 100));
  const taxCents = round(priceCents * (taxPercent / 100));
  const commissionCents = round(priceCents * (commissionPercent / 100));

  // Se material/mão de obra vieram separados, usa-os; senão, o custo inteiro
  // vira uma fatia "material" única.
  const mat = materialCents ?? costCents;
  const lab = laborCents ?? 0;

  const pct = (c: number) => (priceCents > 0 ? (c / priceCents) * 100 : 0);
  const composition: PriceSlice[] = (
    [
      { key: "material", label: "Material", cents: mat, pct: pct(mat) },
      { key: "labor", label: "Mão de obra", cents: lab, pct: pct(lab) },
      { key: "expenses", label: "Despesas", cents: expensesCents, pct: pct(expensesCents) },
      { key: "tax", label: "Impostos", cents: taxCents, pct: pct(taxCents) },
      { key: "commission", label: "Comissão", cents: commissionCents, pct: pct(commissionCents) },
      { key: "profit", label: "Lucro", cents: profitCents, pct: pct(profitCents) },
    ] as PriceSlice[]
  ).filter((s) => s.cents > 0);

  return {
    ok: true,
    priceCents,
    profitCents,
    marginPercent,
    totalCostCents: totalCost,
    composition,
  };
}

// Reverso: dado o preço-alvo e as taxas, descobre o custo máximo (custo+despesas)
// que preserva a margem, e o lucro embutido.
export interface ReverseInput {
  targetPriceCents: number;
  taxPercent: number;
  commissionPercent: number;
  marginPercent: number;
}

export interface ReverseResult {
  ok: boolean;
  reason?: string;
  maxTotalCostCents: number; // teto de custo+despesas
  profitCents: number;
  taxCents: number;
  commissionCents: number;
}

export function computeReverse(input: ReverseInput): ReverseResult {
  const { targetPriceCents, taxPercent, commissionPercent, marginPercent } =
    input;
  const rate = (taxPercent + commissionPercent + marginPercent) / 100;

  if (rate >= 1) {
    return {
      ok: false,
      reason:
        "A soma de imposto, comissão e margem deve ser menor que 100%.",
      maxTotalCostCents: 0,
      profitCents: 0,
      taxCents: 0,
      commissionCents: 0,
    };
  }

  const taxCents = round(targetPriceCents * (taxPercent / 100));
  const commissionCents = round(targetPriceCents * (commissionPercent / 100));
  const profitCents = round(targetPriceCents * (marginPercent / 100));
  const maxTotalCostCents = targetPriceCents - taxCents - commissionCents - profitCents;

  return {
    ok: true,
    maxTotalCostCents,
    profitCents,
    taxCents,
    commissionCents,
  };
}
