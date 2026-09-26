// Presets por segmento (valores de referência; o usuário ajusta).
// tax = imposto típico, margin = margem saudável de referência.
export interface Segment {
  id: string;
  label: string;
  tax: number;
  margin: number;
  healthyMargin: number; // piso de margem considerado saudável
}

export const SEGMENTS: Segment[] = [
  { id: "", label: "Selecione um segmento (opcional)", tax: 0, margin: 0, healthyMargin: 0 },
  { id: "confeccao", label: "Confecção", tax: 8, margin: 25, healthyMargin: 20 },
  { id: "marcenaria", label: "Marcenaria / Móveis", tax: 6, margin: 30, healthyMargin: 25 },
  { id: "grafica", label: "Gráfica", tax: 10, margin: 25, healthyMargin: 20 },
  { id: "comunicacao", label: "Comunicação visual", tax: 10, margin: 30, healthyMargin: 25 },
  { id: "servicos", label: "Serviços técnicos", tax: 8, margin: 35, healthyMargin: 30 },
  { id: "construcao", label: "Construção", tax: 6, margin: 20, healthyMargin: 15 },
  { id: "manutencao", label: "Manutenção", tax: 8, margin: 30, healthyMargin: 25 },
  { id: "freelancer", label: "Freelancer", tax: 6, margin: 40, healthyMargin: 30 },
];

// Diagnóstico "você está cobrando certo?" com base na margem informada.
export interface Diagnosis {
  level: "good" | "warn" | "bad";
  message: string;
}

export function diagnoseMargin(
  marginPercent: number,
  segment?: Segment,
): Diagnosis {
  if (marginPercent <= 0) {
    return { level: "bad", message: "Sem margem: você não terá lucro nesta venda." };
  }
  const floor = segment?.healthyMargin ?? 15;
  if (segment && segment.id) {
    if (marginPercent < floor) {
      return {
        level: "warn",
        message: `Margem abaixo do recomendado para ${segment.label.toLowerCase()} (${floor}%). Considere revisar o preço.`,
      };
    }
    return {
      level: "good",
      message: `Margem saudável para ${segment.label.toLowerCase()}.`,
    };
  }
  // sem segmento: referência genérica
  if (marginPercent < 15) {
    return { level: "warn", message: "Margem baixa. O padrão saudável costuma ficar acima de 15%." };
  }
  return { level: "good", message: "Margem dentro de um patamar saudável." };
}
