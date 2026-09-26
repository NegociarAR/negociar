"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession, getEntitlements, checkLimit } from "@/lib/entitlements";
import { parseBRLToCents } from "@/lib/format";
import { countProducts } from "./queries";

function parseForm(formData: FormData) {
  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };
  return {
    name: String(formData.get("name") ?? "").trim(),
    sku: str("sku"),
    unit: str("unit"),
    cost_cents: parseBRLToCents(String(formData.get("cost") ?? "")),
  };
}

export async function createProduct(formData: FormData) {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");

  const ent = await getEntitlements();
  const gate = checkLimit(ent, "products", await countProducts());
  if (!gate.allowed) redirect("/produtos?limite=1");

  const fields = parseForm(formData);
  if (!fields.name) redirect("/produtos/novo?erro=Nome%20obrigatório");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ company_id: session.companyId, ...fields })
    .select("id")
    .single();

  if (error) redirect(`/produtos/novo?erro=${encodeURIComponent(error.message)}`);

  revalidatePath("/produtos");
  redirect(`/produtos`);
}

export async function updateProduct(id: string, formData: FormData) {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");

  const fields = parseForm(formData);
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update(fields)
    .eq("id", id)
    .eq("company_id", session.companyId);

  if (error)
    redirect(`/produtos/${id}/editar?erro=${encodeURIComponent(error.message)}`);

  revalidatePath("/produtos");
  redirect("/produtos");
}

export async function deleteProduct(id: string) {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  const supabase = await createClient();
  await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", session.companyId);
  revalidatePath("/produtos");
  redirect("/produtos");
}
