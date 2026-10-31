import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Rate limit simples em memória: 60 req/min por token
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(token: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(token);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(token, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 60) return false;
  entry.count++;
  return true;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env não configurada");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function resolveCompany(token: string): Promise<{ companyId: string } | null> {
  const admin = adminClient();
  const { data } = await admin
    .from("company_appfinancasbr_settings")
    .select("company_id, enabled")
    .eq("inbound_token", token)
    .maybeSingle();
  if (!data?.enabled) return null;
  return { companyId: data.company_id as string };
}

// POST /api/integracoes/appfinancas/transacao
// Body: { referencia_externa: string, data?: "YYYY-MM-DD" }
// Marca a parcela (referencia_externa = installment id) como recebida.
// Idempotente: se já está received, retorna 200.
export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!bearer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!checkRateLimit(bearer)) {
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const company = await resolveCompany(bearer);
  if (!company) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { referencia_externa?: string; data?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const installmentId = body.referencia_externa;
  if (!installmentId) return NextResponse.json({ error: "referencia_externa obrigatório" }, { status: 400 });

  const admin = adminClient();
  const receivedAt = body.data ? new Date(body.data).toISOString() : new Date().toISOString();

  const { data: inst } = await admin
    .from("sale_installments")
    .select("id, status")
    .eq("id", installmentId)
    .eq("company_id", company.companyId)
    .maybeSingle();

  if (!inst) return NextResponse.json({ error: "parcela não encontrada" }, { status: 404 });

  if (inst.status !== "received") {
    await admin
      .from("sale_installments")
      .update({ status: "received", received_at: receivedAt })
      .eq("id", installmentId)
      .eq("company_id", company.companyId);
    revalidatePath("/recebiveis");
    revalidatePath("/dashboard");
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/integracoes/appfinancas/transacao?referencia_externa=<id>
// Desfaz o recebimento. Idempotente: se já está pending, retorna 200.
export async function DELETE(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!bearer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!checkRateLimit(bearer)) {
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const company = await resolveCompany(bearer);
  if (!company) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const installmentId = request.nextUrl.searchParams.get("referencia_externa");
  if (!installmentId) return NextResponse.json({ error: "referencia_externa obrigatório" }, { status: 400 });

  const admin = adminClient();

  const { data: inst } = await admin
    .from("sale_installments")
    .select("id, status")
    .eq("id", installmentId)
    .eq("company_id", company.companyId)
    .maybeSingle();

  if (!inst) return NextResponse.json({ ok: true }); // idempotente

  if (inst.status === "received") {
    await admin
      .from("sale_installments")
      .update({ status: "pending", received_at: null })
      .eq("id", installmentId)
      .eq("company_id", company.companyId);
    revalidatePath("/recebiveis");
    revalidatePath("/dashboard");
  }

  return NextResponse.json({ ok: true });
}
