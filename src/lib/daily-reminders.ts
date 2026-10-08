import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "./email";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function customerName(c: { person_type?: string; name?: string | null; trade_name?: string | null; legal_name?: string | null } | null): string {
  if (!c) return "Cliente";
  return (c.person_type === "pf" ? c.name : (c.trade_name ?? c.legal_name)) ?? "Cliente";
}

function waLink(whatsapp: string | null | undefined, name: string, amountCents: number, dueDate: string): string | null {
  if (!whatsapp) return null;
  const phone = whatsapp.replace(/\D/g, "");
  if (!phone) return null;
  const amount = (amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const dueFmt = new Date(dueDate + "T00:00:00").toLocaleDateString("pt-BR");
  const msg = `Olá, ${name.split(" ")[0]}! Tudo bem? Passando para lembrar da parcela de ${amount} vencida em ${dueFmt}. Fico à disposição para qualquer dúvida.`;
  return `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://negociaroficial.vercel.app";

// Lembretes diários por e-mail: follow-ups de hoje e parcelas vencidas,
// um resumo por empresa (não um e-mail por item — isso seria spam).
// Chamado pela rota de cron, depois da manutenção diária. Falha de
// envio numa empresa não impede o resto — cada e-mail é independente.
export async function sendDailyReminders(admin: SupabaseClient): Promise<{ followupEmails: number; overdueEmails: number }> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const [{ data: companies }, { data: followups }, { data: installments }] = await Promise.all([
    admin.from("companies").select("id, name, email").eq("status", "active").not("email", "is", null),
    admin
      .from("followups")
      .select("company_id, reason, due_date, customers(person_type, name, trade_name, legal_name)")
      .eq("status", "pending")
      .eq("due_date", today),
    admin
      .from("sale_installments")
      .select("company_id, number, due_date, amount_cents, sales(customers(person_type, name, trade_name, legal_name, whatsapp, phone))")
      .eq("status", "pending")
      .lt("due_date", today),
  ]);

  const companyEmail = new Map((companies ?? []).map((c) => [c.id, { name: c.name, email: c.email as string }]));

  // usuários de cada empresa, para gravar uma notificação por pessoa
  // (hoje só o owner — já funciona sozinho quando o multiusuário existir)
  const { data: members } = await admin.from("company_users").select("company_id, user_id");
  const usersByCompany = new Map<string, string[]>();
  for (const m of members ?? []) {
    const list = usersByCompany.get(m.company_id) ?? [];
    list.push(m.user_id);
    usersByCompany.set(m.company_id, list);
  }
  async function notify(companyId: string, type: string, title: string, body: string) {
    const users = usersByCompany.get(companyId) ?? [];
    if (users.length === 0) return;
    await admin.from("notifications").insert(users.map((user_id) => ({ company_id: companyId, user_id, type, title, body })));
  }

  const followupsByCompany = new Map<string, { name: string; reason: string | null }[]>();
  for (const f of followups ?? []) {
    if (!companyEmail.has(f.company_id)) continue;
    const list = followupsByCompany.get(f.company_id) ?? [];
    list.push({ name: customerName((f as { customers?: unknown }).customers as Parameters<typeof customerName>[0]), reason: f.reason });
    followupsByCompany.set(f.company_id, list);
  }

  const overdueByCompany = new Map<string, { name: string; amountCents: number; dueDate: string; waLink: string | null }[]>();
  for (const i of installments ?? []) {
    if (!companyEmail.has(i.company_id)) continue;
    const customers = (i as { sales?: { customers?: unknown } }).sales?.customers as
      | (Parameters<typeof customerName>[0] & { whatsapp?: string | null; phone?: string | null })
      | undefined;
    const name = customerName(customers ?? null);
    const list = overdueByCompany.get(i.company_id) ?? [];
    list.push({
      name,
      amountCents: i.amount_cents,
      dueDate: i.due_date,
      waLink: waLink(customers?.whatsapp ?? customers?.phone, name, i.amount_cents, i.due_date),
    });
    overdueByCompany.set(i.company_id, list);
  }

  let followupEmails = 0;
  let overdueEmails = 0;

  for (const [companyId, items] of followupsByCompany) {
    const c = companyEmail.get(companyId)!;
    const rows = items
      .slice(0, 15)
      .map((f) => `<li>${esc(f.name)}${f.reason ? ` — ${esc(f.reason)}` : ""}</li>`)
      .join("");
    const res = await sendEmail({
      to: c.email,
      subject: `${items.length} follow-up(s) para hoje — NEGOCIAR`,
      html: `<p>Bom dia! Você tem ${items.length} follow-up(s) agendado(s) para hoje:</p>
             <ul>${rows}</ul>
             <p><a href="${APP_URL}/follow-ups">Ver follow-ups →</a></p>`,
    });
    if (res.ok) followupEmails += 1;
    await notify(
      companyId,
      "followup_due",
      `${items.length} follow-up(s) para hoje`,
      items.slice(0, 5).map((f) => f.name).join(", ") + (items.length > 5 ? "..." : ""),
    );
  }

  for (const [companyId, items] of overdueByCompany) {
    const c = companyEmail.get(companyId)!;
    const totalCents = items.reduce((s, i) => s + i.amountCents, 0);
    const rows = items
      .slice(0, 15)
      .map((i) => {
        const amount = (i.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const cobrar = i.waLink ? ` — <a href="${i.waLink}">cobrar via WhatsApp →</a>` : "";
        return `<li>${esc(i.name)} — ${amount}${cobrar}</li>`;
      })
      .join("");
    const res = await sendEmail({
      to: c.email,
      subject: `${items.length} parcela(s) vencida(s) — NEGOCIAR`,
      html: `<p>Você tem ${items.length} parcela(s) vencida(s), totalizando ${(totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}:</p>
             <ul>${rows}</ul>
             <p><a href="${APP_URL}/recebiveis">Ver recebíveis →</a></p>`,
    });
    if (res.ok) overdueEmails += 1;
    await notify(
      companyId,
      "installment_overdue",
      `${items.length} parcela(s) vencida(s)`,
      `Total: ${(totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    );
  }

  return { followupEmails, overdueEmails };
}
