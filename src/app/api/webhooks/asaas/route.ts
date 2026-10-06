import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Salve como: src/app/api/webhooks/asaas/route.ts
//
// Webhook do Asaas: confirma pagamento (Pix/cartão/boleto) e baixa o
// título correspondente em billing_invoices. Protegido pelo token de
// autenticação do webhook (configurado no painel do Asaas e aqui em
// ASAAS_WEBHOOK_TOKEN) — não há sessão de usuário numa chamada de webhook.
export async function POST(request: NextRequest) {
  const token = request.headers.get("asaas-access-token");
  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 500 });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const body = await request.json();
  const event = body?.event as string | undefined;
  const payment = body?.payment as { id: string; value: number } | undefined;

  if (payment && (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED")) {
    const { error } = await admin.rpc("billing_mark_paid_by_asaas", {
      p_asaas_payment_id: payment.id,
      p_amount: Math.round(payment.value * 100),
      p_paid_at: new Date().toISOString(),
    });
    if (error) {
      console.error("billing_mark_paid_by_asaas falhou:", error.message);
      // não retorna 500: evita que o Asaas fique reenviando um evento
      // para um título que, por exemplo, já foi baixado manualmente antes.
    }
  }

  return NextResponse.json({ ok: true });
}
