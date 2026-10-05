import { describe, it, expect } from "vitest";
import { computeSale, type SaleInput } from "./sale-calc";

const base: SaleInput = {
  grossCents: 100000,
  discountPercent: 0,
  discountCents: 0,
  downPaymentCents: 0,
  installments: 1,
  firstDueDate: "2026-10-10",
};
const run = (over: Partial<SaleInput> = {}) => computeSale({ ...base, ...over });
const sum = (rows: { amountCents: number }[]) => rows.reduce((s, r) => s + r.amountCents, 0);

describe("computeSale — desconto", () => {
  it("sem desconto: líquido = bruto", () => {
    const r = run();
    expect(r.ok).toBe(true);
    expect(r.discountCents).toBe(0);
    expect(r.netCents).toBe(100000);
  });

  it("desconto em %: 10% de R$ 1.000,00", () => {
    const r = run({ discountPercent: 10 });
    expect(r.discountCents).toBe(10000);
    expect(r.netCents).toBe(90000);
  });

  it("desconto em %: arredonda para o centavo mais próximo", () => {
    expect(run({ grossCents: 10001, discountPercent: 10 }).discountCents).toBe(1000); // 1000,1
    expect(run({ grossCents: 10005, discountPercent: 10 }).discountCents).toBe(1001); // 1000,5
  });

  it("desconto em R$ é usado quando % é zero", () => {
    const r = run({ discountCents: 2500 });
    expect(r.discountCents).toBe(2500);
    expect(r.netCents).toBe(97500);
  });

  it("% tem precedência sobre o valor em R$ quando os dois vêm preenchidos", () => {
    const r = run({ discountPercent: 10, discountCents: 99999 });
    expect(r.discountCents).toBe(10000);
  });

  it("desconto em R$ maior que o bruto fica limitado ao bruto (líquido zero)", () => {
    const r = run({ discountCents: 500000 });
    expect(r.discountCents).toBe(100000);
    expect(r.netCents).toBe(0);
  });

  it("desconto em % acima de 100 é recusado", () => {
    const r = run({ discountPercent: 150 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Desconto maior/);
    expect(r.rows).toEqual([]);
  });
});

describe("computeSale — validações", () => {
  it("entrada maior que o líquido é recusada", () => {
    const r = run({ downPaymentCents: 100001 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Entrada maior/);
  });

  it("entrada considera o líquido (já com desconto), não o bruto", () => {
    const r = run({ discountPercent: 50, downPaymentCents: 60000 });
    expect(r.ok).toBe(false);
  });

  it("sem data da primeira parcela é recusado", () => {
    const r = run({ firstDueDate: "" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/data/i);
  });
});

describe("computeSale — parcelas", () => {
  it("à vista: 1 parcela no valor líquido, na data informada", () => {
    const r = run();
    expect(r.rows).toEqual([{ number: 1, dueDate: "2026-10-10", amountCents: 100000 }]);
  });

  it("centavos que sobram vão para as primeiras parcelas: R$ 100,00 em 3x", () => {
    const r = run({ grossCents: 10000, installments: 3 });
    expect(r.rows.map((x) => x.amountCents)).toEqual([3334, 3333, 3333]);
  });

  it("R$ 100,00 em 7x: sobra de 4 centavos nas 4 primeiras parcelas, soma exata", () => {
    const r = run({ grossCents: 10000, installments: 7 });
    expect(r.rows.map((x) => x.amountCents)).toEqual([1429, 1429, 1429, 1429, 1428, 1428, 1428]);
    expect(sum(r.rows)).toBe(10000);
  });

  it("nº de parcelas inválido vira 1 (zero, negativo) e fracionário é truncado", () => {
    expect(run({ installments: 0 }).rows).toHaveLength(1);
    expect(run({ installments: -3 }).rows).toHaveLength(1);
    expect(run({ installments: 2.9 }).rows).toHaveLength(2);
  });

  it("com entrada: linha 0 na data base e 1ª parcela 1 mês depois", () => {
    const r = run({ downPaymentCents: 30000, installments: 2 });
    expect(r.rows).toEqual([
      { number: 0, dueDate: "2026-10-10", amountCents: 30000 },
      { number: 1, dueDate: "2026-11-10", amountCents: 35000 },
      { number: 2, dueDate: "2026-12-10", amountCents: 35000 },
    ]);
  });

  it("sem entrada: 1ª parcela na própria data base", () => {
    const r = run({ installments: 3 });
    expect(r.rows.map((x) => x.dueDate)).toEqual(["2026-10-10", "2026-11-10", "2026-12-10"]);
  });

  it("invariante: entrada + parcelas = líquido, e parcelas diferem em no máximo 1 centavo", () => {
    const grosses = [1, 99, 100, 9999, 10000, 12345, 100001, 333333, 987654321];
    const discounts = [0, 5, 33.33];
    const downs = [0, 1, 777];
    for (const g of grosses)
      for (const d of discounts)
        for (const down of downs)
          for (let n = 1; n <= 24; n++) {
            const r = run({ grossCents: g, discountPercent: d, downPaymentCents: down, installments: n });
            if (!r.ok) continue;
            expect(sum(r.rows)).toBe(r.netCents);
            const parcelas = r.rows.filter((x) => x.number > 0).map((x) => x.amountCents);
            expect(Math.max(...parcelas) - Math.min(...parcelas)).toBeLessThanOrEqual(1);
            expect(parcelas.every((p) => Number.isInteger(p) && p >= 0)).toBe(true);
          }
  });
});

describe("computeSale — casos de borda (bugs corrigidos)", () => {
  it("entrada igual ao líquido: só a entrada, sem parcelas de R$ 0,00", () => {
    const r = run({ downPaymentCents: 100000, installments: 3 });
    expect(r.ok).toBe(true);
    expect(r.rows).toEqual([{ number: 0, dueDate: "2026-10-10", amountCents: 100000 }]);
  });

  it("líquido zero (desconto de 100%): nenhuma parcela gerada", () => {
    const r = run({ discountPercent: 100, installments: 3 });
    expect(r.ok).toBe(true);
    expect(r.netCents).toBe(0);
    expect(r.rows).toEqual([]);
  });

  it("nenhuma linha gerada tem valor zero em cenários comuns", () => {
    for (const n of [1, 2, 3, 12])
      for (const down of [0, 10000, 100000])
        for (const d of [0, 10, 100]) {
          const r = run({ installments: n, downPaymentCents: down, discountPercent: d });
          if (r.ok) expect(r.rows.every((x) => x.amountCents > 0)).toBe(true);
        }
  });

  it("desconto em R$ negativo é recusado (não vira acréscimo)", () => {
    const r = run({ discountCents: -5000 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/negativ/);
  });

  it("entrada negativa é recusada", () => {
    const r = run({ downPaymentCents: -5000 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/negativ/);
  });

  it("desconto em % negativo é recusado", () => {
    expect(run({ discountPercent: -10 }).ok).toBe(false);
  });
});

describe("computeSale — datas", () => {
  const due = (first: string, n: number) => run({ firstDueDate: first, installments: n }).rows.map((r) => r.dueDate);

  it("dia 31 cai no último dia do mês mais curto, sem acumular o recuo", () => {
    expect(due("2026-01-31", 4)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("ano bissexto: 31/01/2028 → 29/02/2028", () => {
    expect(due("2028-01-31", 2)).toEqual(["2028-01-31", "2028-02-29"]);
  });

  it("virada de ano", () => {
    expect(due("2026-11-15", 3)).toEqual(["2026-11-15", "2026-12-15", "2027-01-15"]);
  });
});
