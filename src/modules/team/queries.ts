import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import type { TeamMember, PendingInvite, CompanyRole } from "./types";

export async function getTeam(): Promise<{ members: TeamMember[]; invites: PendingInvite[]; myRole: CompanyRole | null }> {
  const session = await getSession();
  if (!session?.companyId) return { members: [], invites: [], myRole: null };

  const supabase = await createClient();
  const [{ data: rows }, { data: invites }] = await Promise.all([
    supabase.rpc("list_team_members", { p_company: session.companyId }),
    supabase
      .from("company_invites")
      .select("id, email, role, created_at, expires_at")
      .eq("company_id", session.companyId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const members: TeamMember[] = (rows ?? []).map((r: { user_id: string; email: string; role: string }) => ({
    userId: r.user_id,
    email: r.email,
    role: r.role as CompanyRole,
    isSelf: r.user_id === session.user.id,
  }));
  const myRole = members.find((m) => m.isSelf)?.role ?? null;

  return {
    members,
    invites: (invites ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role as CompanyRole, createdAt: i.created_at, expiresAt: i.expires_at })),
    myRole,
  };
}
