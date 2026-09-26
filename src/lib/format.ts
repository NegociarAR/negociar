export function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// "1.234,56" ou "1234.56" ou "1234,56" -> 123456 (centavos)
export function parseBRLToCents(input: string): number {
  const raw = (input ?? "").trim();
  if (!raw) return 0;
  // remove tudo que não é dígito, vírgula ou ponto
  let s = raw.replace(/[^\d.,]/g, "");
  // se tem vírgula, ela é o separador decimal (padrão BR): remove pontos de milhar
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const value = parseFloat(s);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}
