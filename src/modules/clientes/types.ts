export type PersonType = "pf" | "pj";

export interface Customer {
  id: string;
  company_id: string;
  person_type: PersonType;
  name: string | null;
  cpf: string | null;
  legal_name: string | null;
  trade_name: string | null;
  cnpj: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  last_contact_at: string | null;
  status: "active" | "inactive" | "blocked";
  contact_name: string | null;
  notes: string | null;
  created_at: string;
}

// nome de exibição conforme o tipo
export function customerDisplayName(c: Partial<Customer>): string {
  if (c.person_type === "pf") return c.name?.trim() || "Sem nome";
  return c.trade_name?.trim() || c.legal_name?.trim() || "Sem nome";
}
