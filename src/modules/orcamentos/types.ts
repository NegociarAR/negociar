// Tipos e labels de orçamento — arquivo puro (sem next/headers),
// seguro para importar de client components.

export type QuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "negotiation"
  | "negotiation_requested"
  | "approved"
  | "rejected"
  | "superseded"
  | "canceled";

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  viewed: "Visualizado",
  negotiation: "Negociação",
  negotiation_requested: "Negociação solicitada",
  approved: "Aprovado",
  rejected: "Recusado",
  superseded: "Substituído",
  canceled: "Cancelado",
};

export interface QuoteListRow {
  id: string;
  number: number;
  status: QuoteStatus;
  version: number;
  total_cents: number;
  created_at: string;
  customer_name: string | null;
}

export interface QuoteItem {
  id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  sort_order: number;
}

export interface QuoteDetail {
  id: string;
  number: number;
  status: QuoteStatus;
  customer_id: string;
  customer_name: string | null;
  customer_whatsapp: string | null;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  valid_until: string | null;
  payment_terms: string | null;
  delivery_terms: string | null;
  notes: string | null;
  decision_reason: string | null;
  version: number;
  is_hourly_contract: boolean;
  hourly_rate_cents: number | null;
  decided_at: string | null;
  public_token: string;
  created_at: string;
  items: QuoteItem[];
}
