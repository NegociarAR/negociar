// Cliente mínimo da API do Asaas. Sandbox por padrão; em produção defina
// ASAAS_API_URL=https://api.asaas.com/v3 e ASAAS_API_KEY de produção.

const BASE_URL = process.env.ASAAS_API_URL ?? "https://sandbox.asaas.com/api/v3";

function headers() {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada.");
  return { "Content-Type": "application/json", access_token: key };
}

export async function asaasCreateCustomer(input: {
  name: string;
  cpfCnpj: string;
  email?: string | null;
  phone?: string | null;
}): Promise<{ id: string }> {
  const res = await fetch(`${BASE_URL}/customers`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: input.name,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
      email: input.email || undefined,
      phone: input.phone || undefined,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.errors?.[0]?.description ?? "Falha ao criar cliente no Asaas.");
  return data;
}

export async function asaasCreatePayment(input: {
  customerId: string;
  valueCents: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  externalReference?: string;
}): Promise<{ id: string; invoiceUrl: string }> {
  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      customer: input.customerId,
      billingType: "UNDEFINED", // cliente escolhe Pix, boleto ou cartão na página de pagamento
      value: Math.round(input.valueCents) / 100,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.errors?.[0]?.description ?? "Falha ao criar cobrança no Asaas.");
  return data;
}
