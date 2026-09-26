import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { Topbar } from "@/components/topbar";
import { NAV_ITEMS, QUICK_ACTIONS } from "@/components/nav-items";
import { getEntitlements, getSession, hasModule } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { followupCounts } from "@/modules/followups/queries";
import { countOpenQuotes } from "@/modules/orcamentos/queries";
import { overdueCount } from "@/modules/recebiveis/queries";
import type { ModuleKey } from "@/lib/entitlements/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/configuracoes");

  if (session.status !== "active") {
    redirect("/status");
  }

  const ent = await getEntitlements();

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", session.companyId)
    .maybeSingle();

  // mapa de módulos liberados
  const moduleKeys: ModuleKey[] = ["clientes", "precifica", "orcamentos", "teams"];
  const modules: Record<string, boolean> = {};
  for (const k of moduleKeys) modules[k] = hasModule(ent, k);

  // contadores dinâmicos da navegação
  const [fu, openQuotes, overdue] = await Promise.all([
    followupCounts(),
    countOpenQuotes(),
    overdueCount(),
  ]);
  const badges = {
    followups: fu.overdue + fu.today,
    openQuotes,
    receivables: overdue,
  };

  // bottom-nav e quick actions continuam com a lista achatada filtrada
  const items = NAV_ITEMS.filter((i) => !i.module || hasModule(ent, i.module));
  const quick = QUICK_ACTIONS.filter((a) => !a.module || hasModule(ent, a.module));

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        companyName={company?.name ?? "Minha empresa"}
        userEmail={session.user.email ?? ""}
        modules={modules}
        badges={badges}
      />
      <main className="flex flex-1 flex-col pb-16 md:pb-0">
        <Topbar />
        <div className="mx-auto w-full max-w-5xl flex-1 p-5 md:p-7">
          {children}
        </div>
      </main>
      <BottomNav items={items} quickActions={quick} />
    </div>
  );
}
