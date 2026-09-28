"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule, getEntitlements, checkLimit } from "@/lib/entitlements";
import { isValidCPF, isValidCNPJ, onlyDigits } from "@/lib/br-validators";
import { countCustomers } from "./queries";
import type { PersonType } from "./types";
import type { ParsedCustomer } from "./import-parser";

// Extrai e normaliza os campos do formulário conforme PF/PJ.
// Documentos são guardados só com dígitos.
function parseForm(formData: FormData) {
  const person_type = (formData.get("person_type") as PersonType) || "pj";
  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };
  const digits = (k: string) => {
    const v = onlyDigits(String(formData.get(k) ?? ""));
    return v === "" ? null : v;
  };
  return {
    person_type,
    name: person_type === "pf" ? str("name") : null,
    cpf: person_type === "pf" ? digits("cpf") : null,
    legal_name: person_type === "pj" ? str("legal_name") : null,
    trade_name: person_type === "pj" ? str("trade_name") : null,
    cnpj: person_type === "pj" ? digits("cnpj") : null,
    contact_name: person_type === "pj" ? str("contact_name") : null,
    phone: str("phone"),
    whatsapp: str("whatsapp"),
    email: str("email"),
    address: str("address"),
    city: str("city"),
    state: str("state"),
    zip_code: digits("zip_code"),
    notes: str("notes"),
  };
}

// Valida documento no server (client-side é só UX). Retorna mensagem ou null.
function validateDoc(fields: ReturnType<typeof parseForm>): string | null {
  if (fields.person_type === "pf" && fields.cpf && !isValidCPF(fields.cpf)) {
    return "CPF inválido.";
  }
  if (fields.person_type === "pj" && fields.cnpj && !isValidCNPJ(fields.cnpj)) {
    return "CNPJ inválido.";
  }
  return null;
}

export async function createCustomer(formData: FormData) {
  const session = await requireModule("clientes");
  if (!session?.companyId) redirect("/login");

  // GATE DE LIMITE (freemium): bloqueia ao atingir o teto do plano.
  const ent = await getEntitlements();
  const used = await countCustomers();
  const gate = checkLimit(ent, "customers", used);
  if (!gate.allowed) {
    redirect("/clientes?limite=1");
  }

  const fields = parseForm(formData);
  const docErr = validateDoc(fields);
  if (docErr) {
    redirect(`/clientes/novo?erro=${encodeURIComponent(docErr)}`);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ company_id: session.companyId, ...fields })
    .select("id")
    .single();

  if (error) {
    redirect(`/clientes/novo?erro=${encodeURIComponent(error.message)}`);
  }

  // registra na timeline
  await supabase.from("activities").insert({
    company_id: session.companyId,
    customer_id: data.id,
    type: "customer_created",
    title: "Cliente cadastrado",
  });

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  const session = await requireModule("clientes");
  if (!session?.companyId) redirect("/login");

  const fields = parseForm(formData);
  const docErr = validateDoc(fields);
  if (docErr) {
    redirect(`/clientes/${id}/editar?erro=${encodeURIComponent(docErr)}`);
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update(fields)
    .eq("id", id)
    .eq("company_id", session.companyId);

  if (error) {
    redirect(`/clientes/${id}/editar?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

export async function deleteCustomer(id: string) {
  const session = await requireModule("clientes");
  if (!session?.companyId) redirect("/login");

  const supabase = await createClient();
  // soft-delete
  await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", session.companyId);

  revalidatePath("/clientes");
  redirect("/clientes");
}

// Registra um contato: atualiza last_contact_at e grava na timeline.
// Usado pelo botão "Enviar WhatsApp" da recuperação.
export async function registerContact(customerId: string, channel = "whatsapp") {
  const session = await requireModule("clientes");
  if (!session?.companyId) return { ok: false };
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase
    .from("customers")
    .update({ last_contact_at: now })
    .eq("id", customerId)
    .eq("company_id", session.companyId);
  await supabase.from("activities").insert({
    company_id: session.companyId,
    customer_id: customerId,
    type: "contact",
    title: `Contato via ${channel}`,
  });
  revalidatePath("/clientes");
  return { ok: true };
}

// Configura os prazos de status da empresa (sliders 🟡/🔴).
export async function setRelThresholds(yellowDays: number, redDays: number) {
  const session = await requireModule("clientes");
  if (!session?.companyId) return { ok: false };
  const supabase = await createClient();
  await supabase
    .from("companies")
    .update({
      stale_yellow_days: Math.max(1, yellowDays),
      stale_red_days: Math.max(yellowDays + 1, redDays),
    })
    .eq("id", session.companyId);
  revalidatePath("/clientes");
  return { ok: true };
}

// Quantos clientes ainda cabem no plano (null = ilimitado).
// Importação em massa também respeita o teto do freemium.
async function customerRoom(): Promise<number | null> {
  const gate = checkLimit(await getEntitlements(), "customers", await countCustomers());
  return gate.remaining;
}

function limitError(room: number) {
  return room === 0
    ? "Você atingiu o limite de clientes do seu plano."
    : `Seu plano permite importar mais ${room} cliente(s). Reduza a planilha ou faça upgrade.`;
}

// Importa clientes em massa a partir de linhas "Nome, telefone".
export async function importCustomers(raw: string) {
  const session = await requireModule("clientes");
  if (!session?.companyId) return { ok: false, imported: 0 };

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = lines
    .map((line) => {
      // aceita vírgula, ponto-e-vírgula ou tab como separador
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      const name = parts[0];
      const phone = parts[1] ?? null;
      if (!name) return null;
      return {
        company_id: session.companyId,
        person_type: "pj" as const,
        trade_name: name,
        phone,
        whatsapp: phone,
        last_contact_at: new Date().toISOString(),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return { ok: true, imported: 0 };

  const room = await customerRoom();
  if (room !== null && rows.length > room)
    return { ok: false, imported: 0, error: limitError(room) };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert(rows);
  if (error) return { ok: false, imported: 0, error: error.message };

  revalidatePath("/clientes");
  return { ok: true, imported: rows.length };
}

// Grava clientes já parseados/validados (vindos da planilha).
export async function importParsedCustomers(rows: ParsedCustomer[]) {
  const session = await requireModule("clientes");
  if (!session?.companyId) return { ok: false, imported: 0 };
  if (rows.length === 0) return { ok: true, imported: 0 };

  const room = await customerRoom();
  if (room !== null && rows.length > room)
    return { ok: false, imported: 0, error: limitError(room) };

  const supabase = await createClient();
  const now = new Date().toISOString();
  const payload = rows.map((r) => ({
    company_id: session.companyId,
    person_type: r.person_type,
    name: r.person_type === "pf" ? r.name : null,
    trade_name: r.person_type === "pj" ? r.name : null,
    cpf: r.cpf,
    cnpj: r.cnpj,
    phone: r.phone,
    whatsapp: r.whatsapp,
    email: r.email,
    city: r.city,
    state: r.state,
    last_contact_at: now,
  }));

  const { error } = await supabase.from("customers").insert(payload);
  if (error) return { ok: false, imported: 0, error: error.message };

  revalidatePath("/clientes");
  return { ok: true, imported: payload.length };
}

// Muda o status de cadastro do cliente (ativo/inativo/bloqueado).
export async function setCustomerStatus(
  customerId: string,
  status: "active" | "inactive" | "blocked",
) {
  const session = await requireModule("clientes");
  if (!session?.companyId) return { ok: false };
  const supabase = await createClient();
  await supabase
    .from("customers")
    .update({ status, status_changed_at: new Date().toISOString() })
    .eq("id", customerId)
    .eq("company_id", session.companyId);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${customerId}`);
  return { ok: true };
}

// Inativação automática: marca como inativo quem está 'active' mas não tem
// orçamento nem venda há mais de 3 meses. Roda na leitura da lista.
// Idempotente e barato (um update condicional).
export async function autoInactivateStale() {
  const session = await requireModule("clientes");
  if (!session?.companyId) return;
  const supabase = await createClient();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  const cutoffISO = cutoff.toISOString();

  // clientes ativos da empresa
  const { data: actives } = await supabase
    .from("customers")
    .select("id, created_at")
    .eq("company_id", session.companyId)
    .eq("status", "active")
    .eq("stage", "customer")
    .is("deleted_at", null);
  if (!actives || actives.length === 0) return;

  // ids com orçamento OU venda recentes (dentro dos 3 meses)
  const [quotes, sales] = await Promise.all([
    supabase
      .from("quotes")
      .select("customer_id")
      .eq("company_id", session.companyId)
      .gte("created_at", cutoffISO),
    supabase
      .from("sales")
      .select("customer_id")
      .eq("company_id", session.companyId)
      .gte("sold_at", cutoffISO),
  ]);

  const recent = new Set<string>();
  quotes.data?.forEach((q) => recent.add(q.customer_id));
  sales.data?.forEach((s) => recent.add(s.customer_id));

  // inativa quem: foi criado há mais de 3 meses E não tem atividade recente
  const toInactivate = actives
    .filter((c) => c.created_at < cutoffISO && !recent.has(c.id))
    .map((c) => c.id);

  if (toInactivate.length > 0) {
    await supabase
      .from("customers")
      .update({ status: "inactive", status_changed_at: new Date().toISOString() })
      .in("id", toInactivate)
      .eq("company_id", session.companyId);
  }
}
