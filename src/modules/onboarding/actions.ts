"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/entitlements";

async function upsertOnboarding(fields: Record<string, unknown>) {
  const session = await requireModule();
  const supabase = await createClient();
  await supabase.from("company_onboarding").upsert(
    { company_id: session.companyId, ...fields, updated_at: new Date().toISOString() },
    { onConflict: "company_id" },
  );
}

export async function setIssuesInvoices(value: boolean) {
  await upsertOnboarding({ issues_invoices: value });
  revalidatePath("/", "layout");
}

export async function dismissOnboarding() {
  await upsertOnboarding({ dismissed: true });
  revalidatePath("/", "layout");
}

export async function reopenOnboarding() {
  await upsertOnboarding({ dismissed: false });
  revalidatePath("/", "layout");
}
