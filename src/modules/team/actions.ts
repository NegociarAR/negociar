"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { sendEmail } from "@/lib/email";
import type { CompanyRole } from "./types";

type Result = { ok: true } | { ok: false; error: string };

async function originUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host")!;
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function inviteMember(email: string, role: CompanyRole): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  const clean = email.trim().toLowerCase();
  if (!clean.includes("@")) return { ok: false, error: "E-mail inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_team_invite", { p_company: session.companyId, p_email: clean, p_role: role });
  if (error) return { ok: false, error: error.message };

  const { data: company } = await supabase.from("companies").select("name").eq("id", session.companyId).maybeSingle();
  const token = (data as { token: string }).token;
  await sendEmail({
    to: clean,
    subject: `Convite para a equipe de ${company?.name ?? "uma empresa"} no NEGOCIAR`,
    html: `<p>Você foi convidado para fazer parte da equipe de <strong>${company?.name ?? ""}</strong> no NEGOCIAR.</p>
           <p><a href="${await originUrl()}/convite/${token}">Aceitar convite →</a></p>
           <p>Se você não esperava este e-mail, pode ignorá-lo.</p>`,
  });

  revalidatePath("/equipe");
  return { ok: true };
}

export async function revokeInvite(id: string): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  const supabase = await createClient();
  const { error } = await supabase.from("company_invites").update({ status: "revoked" }).eq("id", id).eq("company_id", session.companyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/equipe");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_team_member", { p_company: session.companyId, p_user_id: userId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/equipe");
  return { ok: true };
}

export async function changeRole(userId: string, role: CompanyRole): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_team_role", { p_company: session.companyId, p_user_id: userId, p_role: role });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/equipe");
  return { ok: true };
}
