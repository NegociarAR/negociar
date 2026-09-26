import { redirect } from "next/navigation";
import { getSession } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

// Ponto de entrada único pós-login.
// Avalia o perfil e redireciona:
//   → admin:        /admin
//   → sem empresa:  /configuracoes
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

  // sem empresa vinculada ainda?
  if (!session.companyId) redirect("/configuracoes");

  redirect("/dashboard");
}
