import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import type { ServiceInvoice } from "./invoice-types";

export interface SaleWithoutInvoice {
  id: string;
  customerName: string;
  amountCents: number;
  createdAt: string;
}

function customerName(c: { person_type?: string; name?: string | null; trade_name?: string | null; legal_name?: string | null } | null): string {
  if (!c) return "—";
  return (c.person_type === "pf" ? c.name : (c.trade_name ?? c.legal_name)) ?? "—";
}

export async function listSalesWithoutInvoice(): Promise<SaleWithoutInvoice[]> {
  const session = await getSession();
  if (!session?.companyId) return [];

  const supabase = await createClient();

  // Só mostrar se o fiscal está ativo
  const { data: settings } = await supabase
    .from("company_fiscal_settings")
    .select("enabled")
    .eq("company_id", session.companyId)
    .maybeSingle();
  if (!settings?.enabled) return [];

  // IDs de vendas que já têm nota
  const { data: existing } = await supabase
    .from("service_invoices")
    .select("sale_id")
    .eq("company_id", session.companyId)
    .not("sale_id", "is", null);
  const issuedIds = new Set((existing ?? []).map((r) => r.sale_id as string));

  const { data: sales } = await supabase
    .from("sales")
    .select("id, net_cents, created_at, customers(person_type, name, trade_name, legal_name)")
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  return (sales ?? [])
    .filter((s) => !issuedIds.has(s.id))
    .map((s) => {
      const c = (s as { customers?: unknown }).customers as Parameters<typeof customerName>[0];
      return {
        id: s.id,
        customerName: customerName(c),
        amountCents: s.net_cents,
        createdAt: s.created_at,
      };
    });
}

export async function listServiceInvoices(): Promise<ServiceInvoice[]> {
  const session = await getSession();
  if (!session?.companyId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("service_invoices")
    .select("id, sale_id, status, nfse_number, pdf_url, error_message, amount_cents, created_at, issued_at, customers(person_type, name, trade_name, legal_name)")
    .eq("company_id", session.companyId)
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []).map((r) => ({
    id: r.id,
    saleId: r.sale_id,
    customerName: customerName((r as { customers?: unknown }).customers as Parameters<typeof customerName>[0]),
    status: r.status as ServiceInvoice["status"],
    nfseNumber: r.nfse_number,
    pdfUrl: r.pdf_url,
    errorMessage: r.error_message,
    amountCents: r.amount_cents,
    createdAt: r.created_at,
    issuedAt: r.issued_at,
  }));
}
