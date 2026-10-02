import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
}

// As mais recentes (lidas e não lidas), para o sino do Topbar. RLS já
// restringe a user_id = auth.uid() — não precisa filtrar companyId aqui.
export async function listNotifications(limit = 20): Promise<{ items: AppNotification[]; unreadCount: number }> {
  const session = await getSession();
  if (!session) return { items: [], unreadCount: 0 };

  const supabase = await createClient();
  const [{ data }, { count }] = await Promise.all([
    supabase.from("notifications").select("id, type, title, body, created_at, read_at").order("created_at", { ascending: false }).limit(limit),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);

  return {
    items: (data ?? []).map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, createdAt: n.created_at, readAt: n.read_at })),
    unreadCount: count ?? 0,
  };
}
