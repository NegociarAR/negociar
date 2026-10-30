"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/entitlements";
import { asaasCreateCustomerFor, asaasCreatePaymentFor, asaasBaseUrlFor } from "@/lib/asaas";
import { sendReceivedToAppFinancasBr, undoReceivedInAppFinancasBr } from "@/lib/appfinancasbr";

async function getAppFinancasBrToken(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string) {
  const { data } = await supabase
    .from("company_appfinancasbr_settings")
    .select("token, enabled")
    .eq("company_id", companyId)
    .maybeSingle();
  if (!data?.enabled || !data.token) return null;
  return data.token as string;
}

export async function markReceived(installmentId: string) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return;
  const supabase = await createClient();

  const { data: inst } = await supabase
    .from("sale_installments")
    .select("amount_cents, number, sales(customers(person_type, name, trade_name, legal_name))")
    .eq("id", installmentId)
    .eq("company_id", session.companyId)
    .maybeSingle();

  await supabase
    .from("sale_installments")
    .update({ status: "received", received_at: new Date().toISOString() })
    .eq("id", installmentId)
    .eq("company_id", session.companyId);

  revalidatePath("/recebiveis");
  revalidatePath("/dashboard");

  // integração AppFinançasBr — best-effort, falha silenciosa
  try {
    const token = await getAppFinancasBrToken(supabase, session.companyId);
    if (token && inst) {
      const sale = (inst as { sales?: unknown }).sales as { customers?: { person_type?: string; name?: string | null; trade_name?: string | null; legal_name?: string | null } | null } | null;
      const c = sale?.customers;
      const clientName = c?.person_type === "pf" ? (c.name ?? "Cliente") : (c?.trade_name ?? c?.legal_name ?? "Cliente");
      const parcelaLabel = inst.number === 0 ? "entrada" : `parcela ${inst.number}`;
      await sendReceivedToAppFinancasBr(token, {
        valorCents: inst.amount_cents,
        data: new Date().toISOString().slice(0, 10),
        descricao: `${clientName} — ${parcelaLabel}`,
        referenciaExterna: installmentId,
      });
    }
  } catch (e) {
    console.error("AppFinançasBr markReceived falhou:", e);
  }
}

export async function undoReceived(installmentId: string) {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return;
  const supabase = await createClient();

  await supabase
    .from("sale_installments")
    .update({ status: "pending", received_at: null })
    .eq("id", installmentId)
    .eq("company_id", session.companyId);

  revalidatePath("/recebiveis");
  revalidatePath("/dashboard");

  // integração AppFinançasBr — best-effort, falha silenciosa
  try {
    const token = await getAppFinancasBrToken(supabase, session.companyId);
    if (token) {
      await undoReceivedInAppFinancasBr(token, installmentId);
    }
  } catch (e) {
    console.error("AppFinançasBr undoReceived falhou:", e);
  }
}

type ChargeResult = { ok: true; invoiceUrl: string } | { ok: false; error: string };

// Gera uma cobrança Pix/cartão/boleto no Asaas DA PRÓPRIA EMPRESA para
// esta parcela. Usa a API key que a empresa cadastrou em Configurações —
// o NEGOCIAR não intermedia o pagamento, só dispara a cobrança.
export async function chargeWithAsaas(installmentId: string): Promise<ChargeResult> {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("company_asaas_client_settings")
    .select("api_key, environment, enabled")
    .eq("company_id", session.companyId)
    .maybeSingle();
  if (!settings?.enabled || !settings.api_key) {
    return { ok: false, error: "Cobrança automática via Asaas não está ativada. Configure em Configurações." };
  }

  const { data: inst } = await supabase
    .from("sale_installments")
    .select(
      "id, amount_cents, due_date, number, asaas_payment_id, sales(customers(id, person_type, name, trade_name, legal_name, cpf, cnpj, email, whatsapp, phone, asaas_customer_id))",
    )
    .eq("id", installmentId)
    .eq("company_id", session.companyId)
    .maybeSingle();
  if (!inst) return { ok: false, error: "Parcela não encontrada." };
  if (inst.asaas_payment_id) return { ok: false, error: "Esta parcela já tem uma cobrança Asaas gerada." };

  const sale = (inst as { sales?: unknown }).sales as { customers?: Record<string, unknown> } | null;
  const customer = sale?.customers as
    | {
        id: string;
        person_type: string;
        name: string | null;
        trade_name: string | null;
        legal_name: string | null;
        cpf: string | null;
        cnpj: string | null;
        email: string | null;
        whatsapp: string | null;
        phone: string | null;
        asaas_customer_id: string | null;
      }
    | undefined;
  if (!customer) return { ok: false, error: "Cliente não encontrado para esta venda." };

  const document = customer.person_type === "pf" ? customer.cpf : customer.cnpj;
  if (!document) return { ok: false, error: "Cadastre o CPF/CNPJ do cliente antes de gerar a cobrança." };

  const baseUrl = asaasBaseUrlFor((settings.environment as "sandbox" | "producao") ?? "sandbox");
  let asaasCustomerId = customer.asaas_customer_id;
  if (!asaasCustomerId) {
    try {
      const name = customer.person_type === "pf" ? customer.name ?? "Cliente" : customer.trade_name ?? customer.legal_name ?? "Cliente";
      const created = await asaasCreateCustomerFor(settings.api_key, baseUrl, {
        name,
        cpfCnpj: document,
        email: customer.email,
        phone: customer.whatsapp ?? customer.phone,
      });
      asaasCustomerId = created.id;
      await supabase.from("customers").update({ asaas_customer_id: asaasCustomerId }).eq("id", customer.id);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Falha ao criar cliente no Asaas." };
    }
  }

  try {
    const payment = await asaasCreatePaymentFor(settings.api_key, baseUrl, {
      customerId: asaasCustomerId,
      valueCents: inst.amount_cents,
      dueDate: inst.due_date,
      description: `Parcela ${inst.number === 0 ? "entrada" : inst.number}`,
      externalReference: inst.id,
    });
    await supabase
      .from("sale_installments")
      .update({ asaas_payment_id: payment.id, asaas_invoice_url: payment.invoiceUrl })
      .eq("id", inst.id);
    revalidatePath("/recebiveis");
    return { ok: true, invoiceUrl: payment.invoiceUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao criar cobrança no Asaas." };
  }
}
