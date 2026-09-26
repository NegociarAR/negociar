"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

export async function markReceived(installmentId: string) {
  const session = await getSession();
  if (!session?.companyId) return;
  const supabase = await createClient();
  await supabase
    .from("sale_installments")
    .update({ status: "received", received_at: new Date().toISOString() })
    .eq("id", installmentId)
    .eq("company_id", session.companyId);
  revalidatePath("/recebiveis");
  revalidatePath("/dashboard");
}

export async function undoReceived(installmentId: string) {
  const session = await getSession();
  if (!session?.companyId) return;
  const supabase = await createClient();
  await supabase
    .from("sale_installments")
    .update({ status: "pending", received_at: null })
    .eq("id", installmentId)
    .eq("company_id", session.companyId);
  revalidatePath("/recebiveis");
  revalidatePath("/dashboard");
}
