"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { asaasCreateCustomer, asaasCreatePayment } from "@/lib/asaas";

type Result = { ok: true; n?: number } | { ok: false; error: string };

async function adminSupabase() {
  const s = await getSession();
  if (!s?.isAdmin) throw new Error("Acesso negado.");
  return { supabase: await createClient(), userId: s.user.id };
}

// Ativa cobrança automática via Asaas para a empresa (cria o cliente no
// Asaas se ainda não existir). Empresas em modo manual não são afetadas —
// os dois fluxos coexistem.
export async function enableAsaasBilling(companyId: string): Promise<Result> {
  const { supabase } = await adminSupabase();
  const { data: company } = await supabase
    .from("companies")
    .select("name, legal_name, cnpj, email, phone, asaas_customer_id")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) return { ok: false, error: "Empresa não encontrada." };
  if (!company.cnpj) return { ok: false, error: "Cadastre o CNPJ da empresa antes de ativar a cobrança automática." };

  let asaasCustomerId = company.asaas_customer_id as string | null;
  if (!asaasCustomerId) {
    try {
      const customer = await asaasCreateCustomer({
        name: company.legal_name || company.name,
        cpfCnpj: company.cnpj,
        email: company.email,
        phone: company.phone,
      });
      asaasCustomerId = customer.id;
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Falha ao criar cliente no Asaas." };
    }
  }

  const { error } = await supabase
    .from("companies")
    .update({ billing_method: "asaas", asaas_customer_id: asaasCustomerId })
    .eq("id", companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/empresas/${companyId}`);
  return { ok: true };
}

export async function disableAsaasBilling(companyId: string): Promise<Result> {
  const { supabase } = await adminSupabase();
  const { error } = await supabase.from("companies").update({ billing_method: "manual" }).eq("id", companyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/empresas/${companyId}`);
  return { ok: true };
}

// Cria a cobrança no Asaas para cada título em aberto de empresa no modo
// Asaas que ainda não tem cobrança gerada. Rode depois de "Gerar
// mensalidades" (generateInvoices) — os dois fluxos cobrem o mesmo
// conjunto de títulos (billing_invoices); este só soma a parte Asaas.
export async function syncAsaasCharges(): Promise<Result> {
  const { supabase } = await adminSupabase();

  const { data: invoices, error } = await supabase
    .from("billing_invoices")
    .select("id, description, amount_cents, due_date, companies(asaas_customer_id, billing_method)")
    .eq("status", "open")
    .is("asaas_payment_id", null);
  if (error) return { ok: false, error: error.message };

  let n = 0;
  for (const inv of invoices ?? []) {
    const companiesField = (inv as { companies?: unknown }).companies;
    const company = (Array.isArray(companiesField) ? companiesField[0] : companiesField) as
      | { asaas_customer_id: string | null; billing_method: string }
      | undefined;
    if (!company || company.billing_method !== "asaas" || !company.asaas_customer_id) continue;

    try {
      const payment = await asaasCreatePayment({
        customerId: company.asaas_customer_id,
        valueCents: inv.amount_cents,
        dueDate: inv.due_date,
        description: inv.description ?? "Mensalidade NEGOCIAR",
        externalReference: inv.id,
      });
      await supabase
        .from("billing_invoices")
        .update({ asaas_payment_id: payment.id, asaas_invoice_url: payment.invoiceUrl })
        .eq("id", inv.id);
      n++;
    } catch (e) {
      console.error(`Asaas: falha ao cobrar fatura ${inv.id}:`, e);
    }
  }

  revalidatePath("/admin/financeiro");
  return { ok: true, n };
}
