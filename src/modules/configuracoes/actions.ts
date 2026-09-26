"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { onlyDigits, isValidCNPJ } from "@/lib/br-validators";

export async function updateCompany(formData: FormData) {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };

  const cnpjRaw = onlyDigits(String(formData.get("cnpj") ?? ""));
  if (cnpjRaw && !isValidCNPJ(cnpjRaw)) {
    return { ok: false, error: "CNPJ inválido." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Nome da empresa é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name,
      legal_name: str("legal_name"),
      cnpj: cnpjRaw || null,
      email: str("email"),
      phone: str("phone"),
      address: str("address"),
      city: str("city"),
      state: str("state"),
      zip_code: onlyDigits(String(formData.get("zip_code") ?? "")) || null,
    })
    .eq("id", session.companyId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}

// Grava a URL pública da logo (upload feito no client via Storage).
export async function setCompanyLogo(logoUrl: string | null) {
  const session = await getSession();
  if (!session?.companyId) return { ok: false };
  const supabase = await createClient();
  await supabase
    .from("companies")
    .update({ logo_url: logoUrl })
    .eq("id", session.companyId);
  revalidatePath("/configuracoes");
  return { ok: true };
}

// Usuário solicita mudança de plano (opção B — sem pagamento automático).
export async function requestPlanChange(requestedPlanId: string, note?: string) {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  const supabase = await createClient();

  // plano atual
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("company_id", session.companyId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  // evita duplicar solicitação pendente
  const { data: existing } = await supabase
    .from("plan_requests")
    .select("id")
    .eq("company_id", session.companyId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "Você já tem uma solicitação pendente." };
  }

  const { error } = await supabase.from("plan_requests").insert({
    company_id: session.companyId,
    requested_plan_id: requestedPlanId,
    current_plan_id: sub?.plan_id ?? null,
    requested_by: session.user.id,
    note: note ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}
