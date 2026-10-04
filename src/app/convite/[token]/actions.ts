"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_team_invite", { p_token: token });
  if (error) {
    redirect(`/convite/${token}?erro=${encodeURIComponent(error.message)}`);
  }
  redirect("/dashboard");
}
