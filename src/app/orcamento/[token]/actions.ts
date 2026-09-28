"use server";

import { createClient } from "@/lib/supabase/server";

// Registra que a página pública foi vista (sent -> viewed), via RPC.
export async function markQuoteViewed(token: string) {
  const supabase = await createClient();
  // dono logado enxerga o orçamento via RLS pelo token: não conta como visualização
  const { data: own } = await supabase
    .from("quotes")
    .select("id")
    .eq("public_token", token)
    .maybeSingle();
  if (own) return;
  await supabase.rpc("mark_public_quote_viewed", { p_token: token });
}

// Cliente responde pela página pública: aprova, recusa (com motivo) ou
// pede negociação (com motivo). Usa a RPC security definer.
export async function respondPublicQuote(
  token: string,
  action: "approved" | "rejected" | "negotiate",
  reason?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_public_quote", {
    p_token: token,
    p_action: action,
    p_reason: reason ?? null,
  });
  return { ok: !error, error: error?.message };
}
