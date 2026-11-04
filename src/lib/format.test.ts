import { describe, it, expect } from "vitest";
import { brl, calcMargin } from "./format";

// toLocaleString usa espaço não separável entre "R$" e o valor — normaliza para comparar
const fmt = (c: number) => brl(c).replace(/\s/g, " ");

describe("brl — centavos para real", () => {
  it("formata zero e centavos soltos", () => {
    expect(fmt(0)).toBe("R$ 0,00");
    expect(fmt(5)).toBe("R$ 0,05");
    expect(fmt(99)).toBe("R$ 0,99");
  });

  it("usa ponto de milhar e vírgula decimal", () => {
    expect(fmt(123456)).toBe("R$ 1.234,56");
    expect(fmt(100000000)).toBe("R$ 1.000.000,00");
  });

  it("valores negativos", () => {
    expect(fmt(-1050)).toBe("-R$ 10,50");
  });
});

describe("calcMargin", () => {
  it("retorna null quando preço é null", () => {
    expect(calcMargin(1000, null)).toBeNull();
  });

  it("retorna null quando preço é zero", () => {
    expect(calcMargin(0, 0)).toBeNull();
  });

  it("calcula margem positiva (preço > custo)", () => {
    // custo 60, preço 100 → margem 40%
    expect(calcMargin(6000, 10000)).toBeCloseTo(0.4);
  });

  it("calcula margem negativa (preço < custo)", () => {
    // custo 120, preço 100 → margem -20%
    expect(calcMargin(12000, 10000)).toBeCloseTo(-0.2);
  });

  it("margem zero quando custo == preço", () => {
    expect(calcMargin(5000, 5000)).toBeCloseTo(0);
  });
});
