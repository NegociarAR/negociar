import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendDailyReminders } from "@/lib/daily-reminders";

// Rotina diária: inativa clientes sem movimento há 3 meses e bloqueia
// empresas inadimplentes além da tolerância. Roda via cron da Vercel
// (vercel.json) ou pode ser chamada manualmente com o segredo correto.
//
// Protegida por CRON_SECRET (não pela sessão do usuário: não há usuário
// logado quando o agendador chama). A Vercel Cron já envia
// Authorization: Bearer <CRON_SECRET> automaticamente quando essa env
// existe; qualquer outra chamada precisa do mesmo header.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 500 });
  }

  // service role: ignora RLS de propósito — só esta rota, só com o segredo.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc("run_daily_maintenance");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // lembretes por e-mail (item 1 e 2 do roadmap): best-effort — uma
  // falha de envio não derruba o resto da rotina, que já rodou acima.
  let reminders = { followupEmails: 0, overdueEmails: 0 };
  try {
    reminders = await sendDailyReminders(admin);
  } catch (e) {
    console.error("sendDailyReminders falhou:", e);
  }

  return NextResponse.json({ ok: true, ...data, ...reminders });
}
