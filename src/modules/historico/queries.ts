import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import type { AuditRow } from "./format";

const COLS =
  "id, table_name, entity_type, entity_id, record_label, action, changed_by_email, changed_at, changed_fields, old_data, new_data";

// Histórico da empresa. entityIds: só as linhas ligadas a esses registros (uuids são únicos).
export async function listHistory(opts: {
  entityIds?: string[];
  entityTypes?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ rows: AuditRow[]; hasMore: boolean; total: number }> {
  const session = await getSession();
  if (!session?.companyId) return { rows: [], hasMore: false, total: 0 };
  const limit = opts.limit ?? 30;
  const offset = opts.offset ?? 0;

  const supabase = await createClient();

  let rowsQ = supabase
    .from("audit_log")
    .select(COLS)
    .eq("company_id", session.companyId)
    .order("changed_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit); // limit+1 linhas: sabe se há mais

  let countQ = supabase
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("company_id", session.companyId);

  if (opts.entityIds?.length) {
    rowsQ = rowsQ.in("entity_id", opts.entityIds);
    countQ = countQ.in("entity_id", opts.entityIds);
  }
  if (opts.entityTypes?.length) {
    rowsQ = rowsQ.in("entity_type", opts.entityTypes);
    countQ = countQ.in("entity_type", opts.entityTypes);
  }

  const [{ data }, { count }] = await Promise.all([rowsQ, countQ]);
  const all = (data ?? []) as AuditRow[];
  return { rows: all.slice(0, limit), hasMore: all.length > limit, total: count ?? 0 };
}
