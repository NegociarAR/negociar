"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/entitlements";

type Result = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cria ou edita uma pessoa de contato. A regra de "uma principal" é garantida no banco.
export async function savePerson(input: {
  id?: string;
  customerId: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  primary: boolean;
}): Promise<Result> {
  const session = await requireModule("clientes");
  const name = input.name.trim();
  const email = input.email.trim();
  if (!name) return { ok: false, error: "Informe o nome." };
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: "E-mail inválido." };

  const fields = {
    name,
    role: input.role.trim() || null,
    phone: input.phone.trim() || null,
    email: email || null,
  };
  const supabase = await createClient();

  if (input.id) {
    const { error } = await supabase
      .from("customer_people")
      .update({ ...fields, ...(input.primary ? { is_primary: true } : {}) })
      .eq("id", input.id)
      .eq("company_id", session.companyId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("customer_people").insert({
      ...fields,
      company_id: session.companyId,
      customer_id: input.customerId,
      is_primary: input.primary,
    });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/clientes/${input.customerId}`);
  return { ok: true };
}

export async function makePrimary(personId: string, customerId: string): Promise<Result> {
  const session = await requireModule("clientes");
  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_people")
    .update({ is_primary: true })
    .eq("id", personId)
    .eq("company_id", session.companyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientes/${customerId}`);
  return { ok: true };
}

export async function deletePerson(personId: string, customerId: string): Promise<Result> {
  const session = await requireModule("clientes");
  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_people")
    .delete()
    .eq("id", personId)
    .eq("company_id", session.companyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientes/${customerId}`);
  return { ok: true };
}
