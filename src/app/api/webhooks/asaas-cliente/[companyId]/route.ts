import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Salve como: src/app/api/webhooks/asaas-cliente/[companyId]/route.ts
//
// Webhook do Asaas para a cobrança que a PRÓPRIA empresa faz aos clientes
// dela (recebíveis). Cada empresa cadastra esta URL (com o próprio id) no
// painel Asaas DELA, com o webhook_token salvo em
// company_asaas_client_settings como token de autenticação — não há
// sessão de usuário numa chamada de webhook.
export async function POST(request: NextRequest, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const token = request.headers.get("asaas-access-token");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 500 });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: settings } = await admin
    .from("company_asaas_client_settings")
    .select("webhook_token, enabled")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!settings?.enabled || !token || token !== settings.webhook_token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const event = body?.event as string | undefined;
  const payment = body?.payment as { id: string } | undefined;

  if (payment && (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED")) {
    await admin
      .from("sale_installments")
      .update({ status: "received", received_at: new Date().toISOString() })
      .eq("company_id", companyId)
      .eq("asaas_payment_id", payment.id)
      .eq("status", "pending");
    // sem baixa em cascata de mais nada: igual à baixa manual, só marca a parcela.
  }

  return NextResponse.json({ ok: true });
}
