import { createClient } from "@/lib/supabase/server";
import type {
  Entitlements,
  LimitKey,
  ModuleKey,
  PlanLimits,
  PlanModules,
} from "./types";

export * from "./types";

/**
 * Resolve o usuário atual, sua empresa e o plano ativo.
 * Fonte da verdade server-side — a UI apenas reflete o resultado.
 */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // empresa do usuário (MVP: uma por usuário)
  const { data: membership } = await supabase
    .from("company_users")
    .select("company_id, role, companies(status)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  // é admin da plataforma?
  const { data: admin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const isAdmin = Boolean(admin);

  if (!membership) {
    return { user, companyId: null, role: null, status: null, isAdmin };
  }

  const status =
    (membership as { companies?: { status?: string } }).companies?.status ??
    null;

  return {
    user,
    companyId: membership.company_id as string,
    role: membership.role as string,
    status: status as "pending" | "active" | "suspended" | null,
    isAdmin,
  };
}

export async function getEntitlements(): Promise<Entitlements | null> {
  const session = await getSession();
  if (!session?.companyId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("plan_id, plans(id, name, modules, limits)")
    .eq("company_id", session.companyId)
    .in("status", ["active", "trialing"])
    .limit(1)
    .maybeSingle();

  const plan = (data as { plans?: unknown } | null)?.plans as
    | { id: string; name: string; modules: PlanModules; limits: PlanLimits }
    | undefined;

  if (!plan) return null;

  return {
    planId: plan.id,
    planName: plan.name,
    modules: plan.modules ?? {},
    limits: plan.limits ?? {},
  };
}

export function hasModule(ent: Entitlements | null, key: ModuleKey): boolean {
  return Boolean(ent?.modules?.[key]);
}

/** Limite bruto do plano. undefined/null = ilimitado. */
export function planLimit(
  ent: Entitlements | null,
  key: LimitKey,
): number | null {
  const v = ent?.limits?.[key];
  return v === undefined ? null : v;
}

export interface LimitCheck {
  allowed: boolean;
  limit: number | null; // null = ilimitado
  used: number;
  remaining: number | null;
}

/**
 * Verifica se a empresa pode criar mais um item de uma métrica.
 * `used` é contado por quem chama (count(*) ou usage_counters).
 */
export function checkLimit(
  ent: Entitlements | null,
  key: LimitKey,
  used: number,
): LimitCheck {
  const limit = planLimit(ent, key);
  if (limit === null) {
    return { allowed: true, limit: null, used, remaining: null };
  }
  return {
    allowed: used < limit,
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}

// Verifica se o módulo está contratado. Uso nas rotas de cada área para
// bloquear acesso direto por URL (o menu já esconde, isto bloqueia de fato).
export async function checkModuleAccess(key: ModuleKey): Promise<boolean> {
  const ent = await getEntitlements();
  return hasModule(ent, key);
}
