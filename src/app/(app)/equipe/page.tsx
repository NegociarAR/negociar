import { getTeam } from "@/modules/team/queries";
import { TeamManager } from "@/modules/team/team-manager";

export default async function EquipePage() {
  const { members, invites, myRole } = await getTeam();
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold">Equipe</h1>
        <p className="text-sm text-muted">
          {canManage ? "Convide colegas e gerencie quem tem acesso à sua empresa." : "Veja quem tem acesso à sua empresa."}
        </p>
      </header>
      <TeamManager members={members} invites={invites} canManage={canManage} />
    </div>
  );
}
