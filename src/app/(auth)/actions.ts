"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// origin do request atual (dev: localhost; prod: domínio real) — sem hardcode
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
  // admin vai ao painel; cliente ao app
  const { data: admin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .maybeSingle();
  redirect(admin ? "/admin" : "/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const companyName = String(formData.get("company_name") || "").trim();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { company_name: companyName },
      emailRedirectTo: `${await originUrl()}/auth/callback?next=/dashboard`,
    },
  });
  if (error) {
    redirect(`/signup?erro=${encodeURIComponent(error.message)}`);
  }
  // trigger no banco cria empresa + owner + assinatura free.
  // Se a confirmação de e-mail estiver ligada, session vem null:
  // o usuário precisa confirmar antes de logar.
  if (!data.session) {
    redirect("/login?confirme=1");
  }
  redirect("/dashboard");
}

export async function resetPassword(formData: FormData) {
  const email = String(formData.get("email"));
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await originUrl()}/auth/callback?next=/dashboard`,
  });
  redirect(`/recuperar?enviado=1`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
