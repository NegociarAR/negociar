import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";

export interface Product {
  id: string;
  company_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  unit: string | null;
  cost_cents: number;
  current_price_cents: number | null;
  created_at: string;
}

export async function listProducts(search?: string) {
  const session = await getSession();
  if (!session?.companyId) return { products: [] as Product[], total: 0 };

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    const s = `%${search.trim()}%`;
    query = query.or(`name.ilike.${s},sku.ilike.${s}`);
  }

  const { data, count } = await query;
  return { products: (data ?? []) as Product[], total: count ?? 0 };
}

export async function countProducts(): Promise<number> {
  const session = await getSession();
  if (!session?.companyId) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("company_id", session.companyId)
    .is("deleted_at", null);
  return count ?? 0;
}

export async function getProduct(id: string): Promise<Product | null> {
  const session = await getSession();
  if (!session?.companyId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("company_id", session.companyId)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as Product) ?? null;
}

// Histórico de preços (price_calculations) de um produto.
export async function getPriceHistory(productId: string) {
  const session = await getSession();
  if (!session?.companyId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("price_calculations")
    .select("id, suggested_price_cents, margin_percent, is_reverse, created_at")
    .eq("company_id", session.companyId)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}
