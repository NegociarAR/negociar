// Tipos puros do painel de faturamento por hora (sem next/headers).

export type ContractSituation = "pending_invoice" | "overdue" | "invoice_pending" | "ok";

export interface PendingMonth {
  period: string; // YYYY-MM, mês fechado com horas lançadas e sem fatura
  hours: number;
  estimatedCents: number;
}

export interface HourlyContractOverview {
  quoteId: string;
  quoteNumber: number;
  customerName: string;
  rateCents: number;
  currentMonthHours: number; // horas do mês em andamento (informativo, não é pendência)
  pendingMonths: PendingMonth[]; // meses fechados sem fatura — o alerta principal
  lastInvoicePeriod: string | null;
  lastInvoiceCents: number | null;
  lastInvoiceStatus: "pending" | "received" | "overdue" | null;
  overdueInvoicesCount: number; // faturas geradas com parcela vencida
  situation: ContractSituation;
}

export interface HourlyOverview {
  contracts: HourlyContractOverview[];
  totals: {
    pendingInvoiceCount: number; // contratos com mês(es) a faturar
    pendingInvoiceCents: number; // valor estimado total a faturar
    overdueCount: number; // contratos com fatura vencida
    invoicePendingCount: number; // contratos com fatura emitida aguardando recebimento
  };
}
