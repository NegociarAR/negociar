import { describe, it, expect } from "vitest";
import { brl } from "./format";

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
