"use server";

import { createClient } from "@/lib/supabase/server";

// Salve como: src/app/horas-resumo/[token]/actions.ts
export async function respondHourSummary(token: string, status: "approved" | "contested", note?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_hour_summary", {
    p_token: token,
    p_status: status,
    p_note: note ?? null,
  });
  return { ok: !error, error: error?.message };
}
