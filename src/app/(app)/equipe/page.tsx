import { getTeam } from "@/modules/team/queries";
import { TeamManager } from "@/modules/team/team-manager";
import { canManageTeam } from "@/modules/team/access";
import { PageIcon } from "@/components/page-icon";
import { Users } from "lucide-react";

export default async function EquipePage() {
  const { members, invites, myRole } = await getTeam();
  const canManage = canManageTeam(myRole);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <PageIcon module="admin" icon={Users} />
        <div>
          <h1 className="text-xl font-semibold">Equipe</h1>
          <p className="text-sm text-muted">
            {canManage ? "Convide colegas e gerencie quem tem acesso à sua empresa." : "Veja quem tem acesso à sua empresa."}
          </p>
        </div>
      </header>
      <TeamManager members={members} invites={invites} canManage={canManage} />
    </div>
  );
}
