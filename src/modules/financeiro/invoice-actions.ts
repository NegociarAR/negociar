"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { issueInvoice, getInvoiceStatus } from "@/lib/nfse/focus-nfe-client";

type Result = { ok: true; status?: string } | { ok: false; error: string };

// Função central de emissão — chamada tanto pelo botão manual quanto,
// internamente, pela automação ao fechar uma venda. Não falha "alto"
// quando a automação dispara sem configuração completa: isso é
// esperado (empresa ainda não configurou o fiscal) e só não emite nada.
export async function issueServiceInvoiceForSale(saleId: string): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("company_fiscal_settings")
    .select("enabled, api_token, environment, municipal_service_code, tax_regime, iss_rate")
    .eq("company_id", session.companyId)
    .maybeSingle();

  if (!settings?.enabled || !settings.api_token || !settings.municipal_service_code || !settings.tax_regime) {
    return { ok: false, error: "Configure os dados fiscais em Configurações antes de emitir." };
  }

  const { data: existing } = await supabase.from("service_invoices").select("id").eq("sale_id", saleId).maybeSingle();
  if (existing) return { ok: false, error: "Já existe uma nota para esta venda." };

  const { data: sale } = await supabase
    .from("sales")
    .select("id, customer_id, total_cents, notes, customers(name, trade_name, legal_name, person_type, email, cpf, cnpj)")
    .eq("id", saleId)
    .eq("company_id", session.companyId)
    .maybeSingle();
  if (!sale) return { ok: false, error: "Venda não encontrada." };

  const customer = (sale as { customers?: { name?: string | null; trade_name?: string | null; legal_name?: string | null; person_type?: string; email?: string | null; cpf?: string | null; cnpj?: string | null } }).customers;
  const isCompany = customer?.person_type === "pj";
  const name = (isCompany ? (customer?.trade_name ?? customer?.legal_name) : customer?.name) ?? "Cliente";

  const { data: inserted, error: insertError } = await supabase
    .from("service_invoices")
    .insert({
      company_id: session.companyId,
      sale_id: saleId,
      customer_id: sale.customer_id,
      provider_ref: saleId, // 1 nota por venda: a própria venda já é uma referência única e estável
      status: "pending",
      amount_cents: sale.total_cents,
    })
    .select("id")
    .single();
  if (insertError || !inserted) return { ok: false, error: insertError?.message ?? "Erro ao registrar a nota." };

  const result = await issueInvoice({
    ref: inserted.id,
    environment: settings.environment as "homologacao" | "producao",
    apiToken: settings.api_token,
    serviceDescription: sale.notes || "Prestação de serviços",
    serviceValueCents: sale.total_cents,
    municipalServiceCode: settings.municipal_service_code,
    issRate: settings.iss_rate,
    taxRegime: settings.tax_regime as "mei" | "simples_nacional" | "lucro_presumido" | "lucro_real",
    customer: { name, email: customer?.email ?? null, document: customer?.cnpj ?? customer?.cpf ?? null, isCompany },
  });

  await supabase
    .from("service_invoices")
    .update({
      status: result.status,
      nfse_number: result.nfseNumber ?? null,
      verification_code: result.verificationCode ?? null,
      pdf_url: result.pdfUrl ?? null,
      error_message: result.errorMessage ?? null,
      issued_at: result.status === "issued" ? new Date().toISOString() : null,
    })
    .eq("id", inserted.id);

  revalidatePath("/notas-fiscais");
  revalidatePath(`/orcamentos`);
  return result.ok ? { ok: true, status: result.status } : { ok: false, error: result.errorMessage ?? "Erro ao emitir." };
}

// Consulta de novo o status de uma nota "processing" — o jeito de atualizar
// sem depender de webhook (a emissão de NFS-e é sempre assíncrona).
export async function refreshInvoiceStatus(invoiceId: string): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const supabase = await createClient();
  const [{ data: inv }, { data: settings }] = await Promise.all([
    supabase.from("service_invoices").select("id, provider_ref, status").eq("id", invoiceId).eq("company_id", session.companyId).maybeSingle(),
    supabase.from("company_fiscal_settings").select("api_token, environment").eq("company_id", session.companyId).maybeSingle(),
  ]);
  if (!inv) return { ok: false, error: "Nota não encontrada." };
  if (!settings?.api_token) return { ok: false, error: "Configuração fiscal incompleta." };

  const result = await getInvoiceStatus(inv.provider_ref, settings.api_token, settings.environment as "homologacao" | "producao");

  await supabase
    .from("service_invoices")
    .update({
      status: result.status,
      nfse_number: result.nfseNumber ?? null,
      verification_code: result.verificationCode ?? null,
      pdf_url: result.pdfUrl ?? null,
      error_message: result.errorMessage ?? null,
      issued_at: result.status === "issued" ? new Date().toISOString() : null,
    })
    .eq("id", invoiceId);

  revalidatePath("/notas-fiscais");
  return { ok: true, status: result.status };
}
