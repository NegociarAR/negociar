"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

async function originUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host")!;
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?erro=${encodeURIComponent("E-mail ou senha inválidos.")}`);
  }
  // Redireciona pra rota decisora — ela avalia admin/normal/status
  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const companyName = String(formData.get("company_name") || "").trim();
  // escapa HTML pra evitar injeção no e-mail do admin
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { company_name: companyName },
      emailRedirectTo: `${await originUrl()}/auth/callback`,
    },
  });
  if (error) {
    redirect(`/signup?erro=${encodeURIComponent(error.message)}`);
  }

  const adminTo = process.env.ADMIN_ALERT_EMAIL ?? "suitebueno@gmail.com";
  await sendEmail({
    to: adminTo,
    subject: `Nova empresa aguardando aprovação: ${esc(companyName || email)}`,
    html: `<p>Um novo cadastro entrou na plataforma e está aguardando aprovação.</p>
           <p><strong>Empresa:</strong> ${esc(companyName) || "(sem nome)"}<br/>
           <strong>E-mail:</strong> ${esc(email)}</p>
           <p>Acesse o painel para aprovar o acesso.</p>`,
  });

  if (!data.session) {
    redirect("/login?confirme=1");
  }
  redirect("/");
}

export async function resetPassword(formData: FormData) {
  const email = String(formData.get("email"));
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await originUrl()}/auth/callback?type=recovery`,
  });
  redirect(`/recuperar?enviado=1`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
