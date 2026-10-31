import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function autenticar(request: Request): Promise<{ company_id: string } | null> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const { data } = await adminClient()
    .from("company_appfinancasbr_settings")
    .select("company_id")
    .eq("inbound_token", token)
    .eq("enabled", true)
    .maybeSingle();
  return data ?? null;
}

// Recebe notificação de edição de data vinda do AppFinançasBr.
export async function POST(request: Request) {
  const settings = await autenticar(request);
  if (!settings) return Response.json({ error: "Não autorizado." }, { status: 401 });

  let body: { referencia_externa?: string; data?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Corpo inválido." }, { status: 400 }); }

  const { referencia_externa, data } = body;
  if (!referencia_externa) {
    return Response.json({ error: "referencia_externa obrigatório." }, { status: 400 });
  }

  if (data) {
    const { error } = await adminClient()
      .from("sale_installments")
      .update({ received_at: new Date(data).toISOString() })
      .eq("id", referencia_externa)
      .eq("company_id", settings.company_id)
      .eq("status", "received");
    if (error) console.error("[appfinancas POST]", error);
  }

  return Response.json({ ok: true });
}

// Recebe notificação de exclusão vinda do AppFinançasBr — reverte status da parcela.
export async function DELETE(request: Request) {
  const settings = await autenticar(request);
  if (!settings) return Response.json({ error: "Não autorizado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const referenciaExterna = searchParams.get("referencia_externa");
  if (!referenciaExterna) {
    return Response.json({ error: "referencia_externa obrigatório." }, { status: 400 });
  }

  const { error } = await adminClient()
    .from("sale_installments")
    .update({ status: "pending", received_at: null })
    .eq("id", referenciaExterna)
    .eq("company_id", settings.company_id);
  if (error) console.error("[appfinancas DELETE]", error);

  return Response.json({ ok: true });
}
