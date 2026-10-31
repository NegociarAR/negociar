import { createClient } from "@/lib/supabase/server";

export type AppFinancasBrSettings = {
  enabled: boolean;
  tokenMasked: string | null;
  inboundTokenMasked: string | null;
};

export async function getAppFinancasBrSettings(companyId: string): Promise<AppFinancasBrSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_appfinancasbr_settings")
    .select("token, enabled, inbound_token")
    .eq("company_id", companyId)
    .maybeSingle();

  return {
    enabled: data?.enabled ?? false,
    tokenMasked: data?.token ? `••••${(data.token as string).slice(-4)}` : null,
    inboundTokenMasked: data?.inbound_token ? `••••${(data.inbound_token as string).slice(-4)}` : null,
  };
}
