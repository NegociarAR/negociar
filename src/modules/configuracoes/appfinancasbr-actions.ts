"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

type Result = { ok: true } | { ok: false; error: string };

export async function saveAppFinancasBrSettings(input: {
  token: string;
}): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { company_id: session.companyId };
  if (input.token.trim()) {
    patch.token = input.token.trim();
    patch.enabled = true;
  }

  const { error } = await supabase
    .from("company_appfinancasbr_settings")
    .upsert(patch, { onConflict: "company_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function generateAppFinancasBrInboundToken(): Promise<Result & { token?: string }> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const supabase = await createClient();
  const { error } = await supabase
    .from("company_appfinancasbr_settings")
    .upsert({ company_id: session.companyId, inbound_token: token }, { onConflict: "company_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes");
  return { ok: true, token };
}

export async function disableAppFinancasBr(): Promise<Result> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_appfinancasbr_settings")
    .update({ enabled: false })
    .eq("company_id", session.companyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/configuracoes");
  return { ok: true };
}
