import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import type { PipelineBoard, PipelineCard } from "./pipeline-types";
import type { Stage } from "./stages";

function displayName(c: {
  person_type: string;
  name: string | null;
  trade_name: string | null;
  legal_name: string | null;
}): string {
  return (c.person_type === "pf" ? c.name : (c.trade_name ?? c.legal_name)) ?? "Contato";
}

// Board do pipeline: contatos da empresa agrupados por estágio, mais recentes primeiro.
// Cap por coluna evita carregar uma lista gigante de clientes antigos no board.
const MAX_PER_COLUMN = 60;

export async function getPipelineBoard(): Promise<PipelineBoard> {
  const empty: PipelineBoard = { lead: [], opportunity: [], customer: [], lost: [] };
  const session = await getSession();
  if (!session?.companyId) return empty;

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, person_type, name, trade_name, legal_name, stage, estimated_value_cents, lead_source, last_contact_at, created_at, lost_reason")
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(400); // segurança: nunca busca a base inteira de uma vez

  const board: PipelineBoard = { lead: [], opportunity: [], customer: [], lost: [] };
  for (const c of data ?? []) {
    const stage = (c.stage ?? "customer") as Stage;
    if (board[stage].length >= MAX_PER_COLUMN) continue;
    const card: PipelineCard = {
      id: c.id,
      name: displayName(c),
      personType: c.person_type as "pf" | "pj",
      stage,
      estimatedValueCents: c.estimated_value_cents,
      leadSource: c.lead_source,
      lastContactAt: c.last_contact_at,
      createdAt: c.created_at,
      lostReason: c.lost_reason,
    };
    board[stage].push(card);
  }
  return board;
}
