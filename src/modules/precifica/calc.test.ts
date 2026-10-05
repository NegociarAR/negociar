import { describe, it, expect } from "vitest";
import { computePrice, computeReverse, type PriceInput } from "./calc";

const base: PriceInput = { costCents: 10000, expensesCents: 0, taxPercent: 10, commissionPercent: 5, marginPercent: 20 };
const price = (over: Partial<PriceInput> = {}) => computePrice({ ...base, ...over });

describe("computePrice — markup divisor", () => {
  it("caso de referência: custo R$ 100 com 10% imposto, 5% comissão, 20% margem", () => {
    const r = price();
    expect(r.ok).toBe(true);
    expect(r.priceCents).toBe(15385); // 10000 / 0,65
    expect(r.profitCents).toBe(3077);
    expect(r.totalCostCents).toBe(10000);
  });

  it("despesas entram no custo antes do markup", () => {
    const r = price({ costCents: 8000, expensesCents: 2000 });
    expect(r.totalCostCents).toBe(10000);
    expect(r.priceCents).toBe(15385);
  });

  it("sem taxas nem margem o preço é o próprio custo", () => {
    const r = price({ taxPercent: 0, commissionPercent: 0, marginPercent: 0 });
    expect(r.priceCents).toBe(10000);
  });

  it("composição: fatias somam o preço (tolerância de arredondamento de 3 centavos)", () => {
    const r = price();
    const soma = r.composition.reduce((s, c) => s + c.cents, 0);
    expect(Math.abs(soma - r.priceCents)).toBeLessThanOrEqual(3);
    expect(r.composition.map((c) => c.key)).toEqual(["material", "tax", "commission", "profit"]);
  });

  it("composição: usa material e mão de obra separados quando informados", () => {
    const r = price({ materialCents: 6000, laborCents: 4000 });
    const get = (k: string) => r.composition.find((c) => c.key === k)?.cents;
    expect(get("material")).toBe(6000);
    expect(get("labor")).toBe(4000);
  });

  it("composição: percentuais das fatias somam ~100%", () => {
    const r = price({ materialCents: 6000, laborCents: 4000, expensesCents: 500 });
    const pct = r.composition.reduce((s, c) => s + c.pct, 0);
    expect(pct).toBeGreaterThan(99.9);
    expect(pct).toBeLessThan(100.1);
  });

  it("custo zero: preço zero e composição vazia", () => {
    const r = price({ costCents: 0 });
    expect(r.ok).toBe(true);
    expect(r.priceCents).toBe(0);
    expect(r.composition).toEqual([]);
  });

  it("margem efetiva sobre o preço bate com a margem pedida", () => {
    for (const m of [5, 10, 20, 35, 50]) {
      const r = price({ marginPercent: m, costCents: 123456 });
      const efetiva = (r.profitCents / r.priceCents) * 100;
      expect(Math.abs(efetiva - m)).toBeLessThan(0.01);
    }
  });

  it("preço cresce com a margem e com o imposto", () => {
    let anterior = 0;
    for (const m of [0, 10, 20, 30, 40, 60]) {
      const p = price({ marginPercent: m }).priceCents;
      expect(p).toBeGreaterThan(anterior);
      anterior = p;
    }
    expect(price({ taxPercent: 20 }).priceCents).toBeGreaterThan(price({ taxPercent: 10 }).priceCents);
  });
});

describe("computePrice — limites e validações", () => {
  it("soma de imposto + comissão + margem = 100% é recusada", () => {
    const r = price({ taxPercent: 60, commissionPercent: 20, marginPercent: 20 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/100%/);
    expect(r.priceCents).toBe(0);
  });

  it("acima de 100% também é recusada; 99,99% ainda é calculável", () => {
    expect(price({ taxPercent: 90, commissionPercent: 20, marginPercent: 20 }).ok).toBe(false);
    expect(price({ taxPercent: 59.99, commissionPercent: 20, marginPercent: 20 }).ok).toBe(true);
  });

  it("entrada inválida (NaN/Infinity) é recusada em vez de devolver preço NaN", () => {
    expect(price({ marginPercent: NaN }).ok).toBe(false);
    expect(price({ costCents: NaN }).ok).toBe(false);
    expect(price({ taxPercent: Infinity }).ok).toBe(false);
  });

  it("custo, despesa, imposto ou comissão negativos são recusados", () => {
    expect(price({ costCents: -5000 }).ok).toBe(false);
    expect(price({ expensesCents: -1 }).ok).toBe(false);
    expect(price({ taxPercent: -5 }).ok).toBe(false);
    expect(price({ commissionPercent: -5 }).ok).toBe(false);
  });

  it("resultado sempre devolve centavos inteiros", () => {
    for (const cost of [1, 99, 12345, 987654])
      for (const m of [7.5, 13.33, 22])
        expect(Number.isInteger(price({ costCents: cost, marginPercent: m }).priceCents)).toBe(true);
  });
});

describe("computeReverse — do preço ao custo máximo", () => {
  const rev = { targetPriceCents: 10000, taxPercent: 10, commissionPercent: 5, marginPercent: 20 };

  it("caso de referência: preço R$ 100 → custo máximo R$ 65", () => {
    const r = computeReverse(rev);
    expect(r.ok).toBe(true);
    expect(r.taxCents).toBe(1000);
    expect(r.commissionCents).toBe(500);
    expect(r.profitCents).toBe(2000);
    expect(r.maxTotalCostCents).toBe(6500);
  });

  it("preço = custo máximo + imposto + comissão + lucro (fecha exatamente)", () => {
    for (const target of [1, 999, 12345, 100000]) {
      const r = computeReverse({ ...rev, targetPriceCents: target });
      expect(r.maxTotalCostCents + r.taxCents + r.commissionCents + r.profitCents).toBe(target);
    }
  });

  it("ida e volta: preço calculado a partir de um custo devolve esse custo (±3 centavos)", () => {
    for (const cost of [5000, 12345, 99999]) {
      const p = price({ costCents: cost });
      const back = computeReverse({ targetPriceCents: p.priceCents, taxPercent: 10, commissionPercent: 5, marginPercent: 20 });
      expect(Math.abs(back.maxTotalCostCents - cost)).toBeLessThanOrEqual(3);
    }
  });

  it("soma de taxas ≥ 100% é recusada", () => {
    const r = computeReverse({ ...rev, taxPercent: 60, commissionPercent: 20, marginPercent: 20 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/100%/);
  });

  it("preço-alvo inválido ou negativo é recusado", () => {
    expect(computeReverse({ ...rev, targetPriceCents: NaN }).ok).toBe(false);
    expect(computeReverse({ ...rev, targetPriceCents: -100 }).ok).toBe(false);
  });
});
