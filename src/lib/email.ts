// Envio de e-mail transacional via Resend.
// Se RESEND_API_KEY não estiver configurada, apenas loga e segue —
// o painel funciona sem e-mail até a chave ser adicionada.

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendArgs) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "NEGOCIAR <onboarding@resend.dev>";

  if (!key) {
    console.log(`[email desativado] Para: ${to} | Assunto: ${subject}`);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
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
