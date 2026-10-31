"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/entitlements";

export interface QuoteTemplate {
  id: string;
  name: string;
  discount_cents: number;
  payment_terms: string | null;
  delivery_terms: string | null;
  notes: string | null;
  items: {
    product_id: string | null;
    description: string;
    quantity: number;
    unit_price_cents: number;
  }[];
}

export async function listTemplates(): Promise<{ id: string; name: string }[]> {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("quote_templates")
    .select("id, name")
    .eq("company_id", session.companyId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getTemplate(id: string): Promise<QuoteTemplate | null> {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("quote_templates")
    .select("*, quote_template_items(product_id, description, quantity, unit_price_cents, sort_order)")
    .eq("id", id)
    .eq("company_id", session.companyId)
    .maybeSingle();

  if (!data) return null;

  const items = ((data.quote_template_items as {
    product_id: string | null;
    description: string;
    quantity: number;
    unit_price_cents: number;
    sort_order: number;
  }[]) ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ product_id, description, quantity, unit_price_cents }) => ({
      product_id,
      description,
      quantity,
      unit_price_cents,
    }));

  return {
    id: data.id,
    name: data.name,
    discount_cents: data.discount_cents,
    payment_terms: data.payment_terms,
    delivery_terms: data.delivery_terms,
    notes: data.notes,
    items,
  };
}

export async function createTemplateFromDraft(input: {
  name: string;
  discountCents: number;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  notes: string | null;
  items: {
    product_id: string | null;
    description: string;
    quantity: number;
    unit_price_cents: number;
  }[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  if (!input.name.trim()) return { ok: false, error: "Nome do template é obrigatório." };
  if (input.items.length === 0) return { ok: false, error: "Adicione ao menos um item." };

  const supabase = await createClient();

  const { data: tpl, error: tplErr } = await supabase
    .from("quote_templates")
    .insert({
      company_id:     session.companyId,
      name:           input.name.trim(),
      discount_cents: input.discountCents,
      payment_terms:  input.paymentTerms,
      delivery_terms: input.deliveryTerms,
      notes:          input.notes,
    })
    .select("id")
    .single();

  if (tplErr || !tpl) return { ok: false, error: tplErr?.message ?? "Erro ao criar template." };

  const { error: itemsErr } = await supabase.from("quote_template_items").insert(
    input.items.map((it, idx) => ({
      template_id:      tpl.id,
      company_id:       session.companyId,
      product_id:       it.product_id,
      description:      it.description,
      quantity:         it.quantity,
      unit_price_cents: it.unit_price_cents,
      sort_order:       idx,
    })),
  );

  if (itemsErr) {
    await supabase.from("quote_templates").delete().eq("id", tpl.id);
    return { ok: false, error: itemsErr.message };
  }

  revalidatePath("/orcamentos/novo");
  revalidatePath("/orcamentos/templates");
  return { ok: true, id: tpl.id };
}

export async function deleteTemplate(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireModule("orcamentos");
  if (!session?.companyId) return { ok: false, error: "Sem sessão." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("quote_templates")
    .delete()
    .eq("id", id)
    .eq("company_id", session.companyId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/orcamentos/novo");
  revalidatePath("/orcamentos/templates");
  return { ok: true };
}
