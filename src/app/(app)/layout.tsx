import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { Topbar } from "@/components/topbar";
import { ContentContainer } from "@/components/content-container";
import { CommandPalette } from "@/components/command-palette";
import { NAV_ITEMS, QUICK_ACTIONS } from "@/components/nav-items";
import { getEntitlements, getSession, hasModule } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { followupCounts } from "@/modules/followups/queries";
import { countOpenQuotes } from "@/modules/orcamentos/queries";
import { overdueCount } from "@/modules/recebiveis/queries";
import { listNotifications } from "@/modules/notifications/notification-queries";
import { checkGate } from "@/modules/onboarding/gate";
import type { ModuleKey } from "@/lib/entitlements/types";
import type { CompanyRole } from "@/modules/team/access";

// Rotas isentas da trava de onboarding — onde o usuário completa os passos.
const GATE_EXEMPT = ["/primeiros-passos", "/configuracoes", "/clientes/novo"];

async function getCompany(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();
  return data;
}

async function getMyRole(userId: string): Promise<CompanyRole | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role ?? null) as CompanyRole | null;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/");
  if (session.status !== "active") redirect("/status");

  // Gate de onboarding: exige telefone da empresa + 1 cliente antes de liberar o app.
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/";
  const isExempt = GATE_EXEMPT.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isExempt) {
    const gatePassed = await checkGate(session.companyId);
    if (!gatePassed) redirect("/primeiros-passos");
  }

  // Queries em paralelo (não usar unstable_cache aqui: createClient() lê
  // cookies(), e o Next não permite cookies() dentro de unstable_cache).
  const [ent, company, fu, openQuotes, overdue, notifications, myRole] = await Promise.all([
    getEntitlements(),
    getCompany(session.companyId),
    followupCounts(),
    countOpenQuotes(),
    overdueCount(),
    listNotifications(),
    getMyRole(session.user.id),
  ]);

  const moduleKeys: ModuleKey[] = ["clientes", "precifica", "orcamentos", "teams"];
  const modules: Record<string, boolean> = {};
  for (const k of moduleKeys) modules[k] = hasModule(ent, k);

  const badges = {
    followups: fu.overdue + fu.today,
    openQuotes,
    receivables: overdue,
  };

  const items = NAV_ITEMS.filter(
    (i) => (!i.module || hasModule(ent, i.module)) && !i.blockedRoles?.includes(myRole as CompanyRole)
  );
  const quick = QUICK_ACTIONS?.filter((a) => !a.module || hasModule(ent, a.module)) ?? [];

  return (
    <CommandPalette>
      <div className="flex min-h-dvh">
        <Sidebar
          companyName={company?.name ?? "Minha empresa"}
          userEmail={session.user.email ?? ""}
          modules={modules}
          badges={badges}
          myRole={myRole}
        />
        <main className="flex min-w-0 flex-1 flex-col app-main-scroll md:pb-0">
          <Topbar notifications={notifications} />
          <ContentContainer>{children}</ContentContainer>
        </main>
        <BottomNav items={items} quickActions={quick} badges={badges} />
      </div>
    </CommandPalette>
  );
}
