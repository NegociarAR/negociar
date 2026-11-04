"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

export async function listCategories(): Promise<{ id: string; name: string }[]> {
  const session = await getSession();
  if (!session?.companyId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_categories")
    .select("id, name")
    .eq("company_id", session.companyId)
    .order("name");
  return (data ?? []) as { id: string; name: string }[];
}

export async function createCategory(
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session?.companyId) return { ok: false, error: "Sessão inválida." };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Nome da categoria é obrigatório." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .insert({ company_id: session.companyId, name: trimmed })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe uma categoria com esse nome." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data.id };
}
