import { createClient } from "@/lib/supabase/server";
import type { Person } from "./people-types";

// Pessoas de contato da empresa (principal primeiro). O RLS garante o tenant.
export async function listPeople(customerId: string): Promise<Person[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_people")
    .select("id, name, role, phone, email, is_primary")
    .eq("customer_id", customerId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  return (data ?? []) as Person[];
}
