import nodemailer from "nodemailer";

// Envio de e-mail transacional.
// Ordem de escolha:
//   1. SMTP (SMTP_USER + SMTP_PASS, ex.: Gmail com senha de app) — não exige domínio próprio
//   2. Resend (RESEND_API_KEY) — precisa de domínio verificado para enviar a terceiros
// Sem nenhum dos dois, apenas loga e segue.

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendArgs) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT ?? 465),
        secure: true,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({ from: process.env.EMAIL_FROM ?? `NEGOCIAR <${smtpUser}>`, to, subject, html });
      return { ok: true };
    } catch (e) {
      console.error("SMTP erro:", e);
      return { ok: false };
    }
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "NEGOCIAR <onboarding@resend.dev>";

  if (!key) {
    console.log(`[email desativado] Para: ${to} | Assunto: ${subject}`);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error("Resend erro:", await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("Resend exceção:", e);
    return { ok: false };
  }
}
