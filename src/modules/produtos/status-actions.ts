"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/entitlements";

// Ativa/inativa um produto. Inativo some do seletor de orçamentos, mas nada é apagado.
export async function setProductActive(productId: string, active: boolean) {
  const session = await requireModule("precifica");
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: active })
    .eq("id", productId)
    .eq("company_id", session.companyId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/produtos");
  revalidatePath(`/produtos/${productId}/editar`);
  return { ok: true as const };
}
