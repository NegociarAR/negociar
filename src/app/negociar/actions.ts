"use server";

import { sendEmail } from "@/lib/email";

type Result = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Formulário de interesse da landing: envia um e-mail para o time NEGOCIAR.
// Não depende de sessão nem de banco — só e-mail transacional (Resend).
export async function requestDemo(formData: FormData): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name) return { ok: false, error: "Informe seu nome." };
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: "Informe um e-mail válido." };
  if (!whatsapp) return { ok: false, error: "Informe um WhatsApp para contato." };

  const to = process.env.ADMIN_ALERT_EMAIL ?? "suitebueno@gmail.com";
  const res = await sendEmail({
    to,
    subject: `Novo interesse no NEGOCIAR: ${esc(name)}`,
    html: `<p>Alguém pediu um teste pela landing page.</p>
           <p><strong>Nome:</strong> ${esc(name)}<br/>
           <strong>E-mail:</strong> ${esc(email)}<br/>
           <strong>WhatsApp:</strong> ${esc(whatsapp)}</p>
           ${message ? `<p><strong>Mensagem:</strong><br/>${esc(message).replace(/\n/g, "<br/>")}</p>` : ""}`,
  });

  // mesmo sem RESEND_API_KEY configurada, não falha pro usuário —
  // sendEmail já loga localmente; a landing não deve travar por isso
  if (!res.ok && !res.skipped) return { ok: false, error: "Não foi possível enviar. Tente novamente." };
  return { ok: true };
}
