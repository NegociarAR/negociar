// Presets de alíquota efetiva para o campo de imposto do Precifica.
// Foco no Simples Nacional (onde a maioria dos MEI/PME está).
// São faixas EFETIVAS de referência — o usuário ajusta se precisar.
// Não substitui contador; serve para não deixar o campo 100% aberto.

export interface TaxPreset {
  id: string;
  label: string;
  percent: number | null; // null = informar manualmente
}

export const TAX_PRESETS: TaxPreset[] = [
  { id: "", label: "Selecione o regime", percent: null },
  { id: "mei", label: "MEI (não incide sobre venda)", percent: 0 },
  { id: "simples_i_baixa", label: "Simples — Comércio (Anexo I, faixa inicial)", percent: 4 },
  { id: "simples_i_media", label: "Simples — Comércio (Anexo I, faixa média)", percent: 7.3 },
  { id: "simples_iii_baixa", label: "Simples — Serviços (Anexo III, faixa inicial)", percent: 6 },
  { id: "simples_iii_media", label: "Simples — Serviços (Anexo III, faixa média)", percent: 11.2 },
  { id: "simples_v", label: "Simples — Serviços (Anexo V)", percent: 15.5 },
  { id: "manual", label: "Outro / informar manualmente", percent: null },
];
