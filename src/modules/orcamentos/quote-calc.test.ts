import { describe, it, expect } from "vitest";
import { parseQty, quoteSubtotalCents, quoteTotalCents } from "./quote-calc";

describe("parseQty", () => {
  it("aceita vírgula decimal", () => {
    expect(parseQty("1,5")).toBe(1.5);
  });
  it("aceita ponto decimal", () => {
    expect(parseQty("1.5")).toBe(1.5);
  });
  it("vazio vira 0", () => {
    expect(parseQty("")).toBe(0);
  });
  it("inválido vira 0", () => {
    expect(parseQty("abc")).toBe(0);
  });
  it("inteiro", () => {
    expect(parseQty("3")).toBe(3);
  });
});

describe("quoteSubtotalCents", () => {
  it("soma item único", () => {
    expect(quoteSubtotalCents([{ quantity: "1", unitPrice: "10,00" }])).toBe(1000);
  });
  it("soma múltiplos itens", () => {
    expect(
      quoteSubtotalCents([
        { quantity: "2", unitPrice: "10,00" },
        { quantity: "1", unitPrice: "5,50" },
      ]),
    ).toBe(2550);
  });
  it("quantidade fracionária arredonda centavos", () => {
    expect(quoteSubtotalCents([{ quantity: "1,5", unitPrice: "10,00" }])).toBe(1500);
  });
  it("lista vazia é zero", () => {
    expect(quoteSubtotalCents([])).toBe(0);
  });
  it("item com quantidade inválida não soma", () => {
    expect(quoteSubtotalCents([{ quantity: "abc", unitPrice: "10,00" }])).toBe(0);
  });
});

describe("quoteTotalCents", () => {
  it("sem desconto, total = subtotal", () => {
    expect(quoteTotalCents([{ quantity: "1", unitPrice: "100,00" }], "")).toBe(10000);
  });
  it("aplica desconto", () => {
    expect(quoteTotalCents([{ quantity: "1", unitPrice: "100,00" }], "20,00")).toBe(8000);
  });
  it("desconto maior que subtotal não fica negativo", () => {
    expect(quoteTotalCents([{ quantity: "1", unitPrice: "10,00" }], "50,00")).toBe(0);
  });
  it("desconto exatamente igual ao subtotal zera", () => {
    expect(quoteTotalCents([{ quantity: "1", unitPrice: "10,00" }], "10,00")).toBe(0);
  });
});
