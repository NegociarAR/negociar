"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule, getEntitlements, checkLimit } from "@/lib/entitlements";
import { countProducts } from "@/modules/produtos/queries";
import { computePrice } from "./calc";

// Salva um cálculo direto no histórico e atualiza current_price do produto.
export async function savePriceCalculation(params: {
  productId: string;
  costCents: number;
  expensesCents: number;
  taxPercent: number;
  commissionPercent: number;
  marginPercent: number;
}) {
  const session = await requireModule("precifica");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const r = computePrice(params);
  if (!r.ok) return { ok: false, error: r.reason };

  const supabase = await createClient();

  const { error } = await supabase.from("price_calculations").insert({
    company_id: session.companyId,
    product_id: params.productId,
    cost_cents: params.costCents,
    expenses_cents: params.expensesCents,
    tax_percent: params.taxPercent,
    commission_percent: params.commissionPercent,
    margin_percent: params.marginPercent,
    suggested_price_cents: r.priceCents,
    profit_cents: r.profitCents,
    is_reverse: false,
  });
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("products")
    .update({ current_price_cents: r.priceCents })
    .eq("id", params.productId)
    .eq("company_id", session.companyId);

  revalidatePath("/produtos");
  return { ok: true, priceCents: r.priceCents };
}

// Salva a simulação avulsa como um novo produto (opção A da integração).
// Cria o produto com custo/preço calculados e grava a simulação no histórico.
export async function saveAsProduct(params: {
  name: string;
  costCents: number;
  expensesCents: number;
  taxPercent: number;
  commissionPercent: number;
  marginPercent: number;
}) {
  const session = await requireModule("precifica");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };
  if (!params.name.trim()) return { ok: false, error: "Informe um nome." };

  // gate de limite de produtos
  const ent = await getEntitlements();
  const gate = checkLimit(ent, "products", await countProducts());
  if (!gate.allowed) {
    return { ok: false, error: "limit", limit: gate.limit ?? 0 };
  }

  const r = computePrice(params);
  if (!r.ok) return { ok: false, error: r.reason };

  const supabase = await createClient();

  // cria o produto (custo total = custo + despesas embutidas no cost)
  const { data: product, error: pErr } = await supabase
    .from("products")
    .insert({
      company_id: session.companyId,
      name: params.name.trim(),
      cost_cents: params.costCents + params.expensesCents,
      current_price_cents: r.priceCents,
    })
    .select("id")
    .single();

  if (pErr || !product) {
    return { ok: false, error: pErr?.message ?? "Erro ao criar produto." };
  }

  // grava a simulação no histórico do produto
  await supabase.from("price_calculations").insert({
    company_id: session.companyId,
    product_id: product.id,
    cost_cents: params.costCents,
    expenses_cents: params.expensesCents,
    tax_percent: params.taxPercent,
    commission_percent: params.commissionPercent,
    margin_percent: params.marginPercent,
    suggested_price_cents: r.priceCents,
    profit_cents: r.profitCents,
    is_reverse: false,
  });

  revalidatePath("/produtos");
  return { ok: true, productId: product.id, priceCents: r.priceCents };
}
