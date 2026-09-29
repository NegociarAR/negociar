// Tipos e constantes puros do relatório de recebimentos (sem next/headers),
// seguros para importar de client components.

export interface PaymentRow {
  id: string;
  company_id: string;
  company_name: string;
  reference_period: string;
  description: string | null;
  amount_cents: number;
  paid_amount_cents: number;
  payment_method: string | null;
  paid_at: string;
  due_date: string;
}

export interface MethodTotal {
  method: string;
  label: string;
  count: number;
  cents: number;
}

export const METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  transferencia: "Transferência",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  outro: "Outro",
};
