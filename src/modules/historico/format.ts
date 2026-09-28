// Formatação legível do histórico (arquivo puro).
import { brl } from "@/lib/format";

export const TABLE_LABELS: Record<string, string> = {
  customers: "Cliente", customer_people: "Contato", quotes: "Orçamento", quote_items: "Item do orçamento",
  products: "Produto", product_categories: "Categoria", price_calculations: "Cálculo de preço",
  sales: "Venda", sale_installments: "Parcela", followups: "Follow-up", companies: "Empresa",
  subscriptions: "Plano", plan_requests: "Solicitação de plano", platform_admins: "Administrador", system: "Sistema",
};

export const ACTION_LABELS: Record<string, string> = {
  insert: "Criação", update: "Alteração", delete: "Exclusão", cleanup: "Limpeza de dados",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nome", trade_name: "Nome fantasia", legal_name: "Razão social", cpf: "CPF", cnpj: "CNPJ",
  phone: "Telefone", whatsapp: "WhatsApp", email: "E-mail", city: "Cidade", state: "Estado", zip_code: "CEP",
  address: "Endereço", contact_name: "Contato", notes: "Observações", status: "Status", stage: "Estágio",
  lead_source: "Origem", estimated_value_cents: "Valor potencial", lost_reason: "Motivo da perda",
  converted_at: "Convertido em", lost_at: "Perdido em", last_contact_at: "Último contato", person_type: "Tipo",
  is_active: "Ativo", is_primary: "Principal", role: "Função", cost_cents: "Custo", current_price_cents: "Preço",
  sku: "SKU", unit: "Unidade", total_cents: "Total", subtotal_cents: "Subtotal", discount_cents: "Desconto",
  valid_until: "Validade", payment_terms: "Pagamento", delivery_terms: "Entrega", decision_reason: "Motivo da decisão",
  decided_at: "Decidido em", version: "Versão", number: "Número", quantity: "Quantidade",
  unit_price_cents: "Preço unitário", description: "Descrição", due_date: "Vencimento", amount_cents: "Valor",
  received_at: "Recebido em", payment_method: "Forma de pagamento", doc_type: "Documento", net_cents: "Líquido",
  gross_cents: "Bruto", down_payment_cents: "Entrada", installments: "Parcelas", first_due_date: "1º vencimento",
  discount_percent: "Desconto %", signed_at: "Assinado em", signed_doc_url: "Proposta assinada", plan_id: "Plano",
  requested_plan_id: "Plano solicitado", current_plan_id: "Plano atual", current_period_end: "Fim do período",
  logo_url: "Logo", reason: "Motivo", kind: "Tipo de ação", deleted_at: "Excluído em", completed_at: "Concluído em",
  tax_percent: "Imposto %", margin_percent: "Margem %", commission_percent: "Comissão %",
  suggested_price_cents: "Preço sugerido", stale_yellow_days: "Dias p/ alerta", stale_red_days: "Dias p/ esquecido",
};

// campos técnicos: não interessam ao usuário
const HIDDEN = new Set([
  "id", "company_id", "created_at", "updated_at", "public_token", "sort_order", "root_id", "superseded_by",
  "assigned_to", "signature_kind", "status_changed_at", "is_reverse", "requested_by", "user_id",
]);
const SHOW_ID = new Set(["plan_id", "requested_plan_id", "current_plan_id"]);

export function isVisible(k: string) {
  if (HIDDEN.has(k)) return false;
  if (k.endsWith("_id") && !SHOW_ID.has(k)) return false;
  return true;
}
export const fieldLabel = (k: string) => FIELD_LABELS[k] ?? k;

const DICT: Record<string, string> = {
  active: "Ativo", inactive: "Inativo", blocked: "Bloqueado", pending: "Pendente", done: "Concluído",
  canceled: "Cancelado", received: "Recebido", overdue: "Vencida", suspended: "Suspenso", won: "Ganha",
  trialing: "Em teste", draft: "Rascunho", sent: "Enviado", viewed: "Visualizado", approved: "Aprovado",
  rejected: "Recusado", negotiation: "Negociação", negotiation_requested: "Negociação solicitada",
  superseded: "Substituído", lead: "Lead", opportunity: "Oportunidade", customer: "Cliente", lost: "Perdido",
  avista: "À vista", cartao: "Cartão", pix: "Pix", boleto: "Boleto", transferencia: "Transferência",
  cheque: "Cheque", outro: "Outro", nenhum: "Nenhum", nota_fiscal: "Nota fiscal", recibo: "Recibo",
  contrato: "Contrato", pf: "Pessoa física", pj: "Pessoa jurídica",
};
const DICT_FIELDS = new Set(["status", "stage", "payment_method", "doc_type", "person_type"]);

export function formatValue(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "number") {
    if (field.endsWith("_cents")) return brl(v);
    if (field.endsWith("_percent")) return `${v}%`;
    return String(v);
  }
  if (typeof v === "string") {
    if (DICT_FIELDS.has(field)) return DICT[v] ?? v;
    if (field.endsWith("_at") && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
      return new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + "T00:00:00").toLocaleDateString("pt-BR");
    return v.length > 80 ? v.slice(0, 80) + "…" : v;
  }
  const s = JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}

export interface AuditRow {
  id: number;
  table_name: string;
  entity_type: string;
  entity_id: string | null;
  record_label: string | null;
  action: string;
  changed_by_email: string | null;
  changed_at: string;
  changed_fields: string[] | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

export interface ChangeLine { label: string; from?: string; to?: string }

// Alteração: campo de -> para. Criação/exclusão: resumo dos primeiros campos preenchidos.
export function changeLines(row: AuditRow): ChangeLine[] {
  if (row.action === "update") {
    const keys = row.changed_fields ?? Object.keys(row.new_data ?? {});
    return keys.filter(isVisible).map((k) => ({
      label: fieldLabel(k),
      from: formatValue(k, row.old_data?.[k]),
      to: formatValue(k, row.new_data?.[k]),
    }));
  }
  const snap = row.action === "delete" ? row.old_data : row.new_data;
  return Object.entries(snap ?? {})
    .filter(([k, v]) => isVisible(k) && v !== null && v !== "" && v !== false)
    .slice(0, 4)
    .map(([k, v]) => ({ label: fieldLabel(k), to: formatValue(k, v) }));
}
