import { redirect } from "next/navigation";
import { getSession } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

// Ponto de entrada único pós-login.
// Avalia o perfil e redireciona:
//   → admin:        /admin
//   → sem empresa:  aceita convite pendente ou /sem-empresa
//   → suspenso:     /status
//   → normal:       /dashboard
export default async function RootPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const supabase = await createClient();

  // é admin?
  const { data: admin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (admin) redirect("/admin");

  // empresa pendente/suspensa?
  if (session.status === "pending" || session.status === "suspended") {
    redirect("/status");
  }

  // sem empresa vinculada: tenta aceitar o convite pendente do próprio e-mail;
  // sem convite, tela explicativa (fora do layout do app, para não entrar em loop)
  if (!session.companyId) {
    const { data: claimed } = await supabase.rpc("claim_my_pending_invite");
    if (claimed) redirect("/dashboard");
    redirect("/sem-empresa");
  }

  redirect("/dashboard");
}
