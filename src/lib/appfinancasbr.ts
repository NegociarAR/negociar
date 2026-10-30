const BASE_URL = process.env.APPFINANCASBR_API_URL ?? "https://appfinancasbr.com";

export async function sendReceivedToAppFinancasBr(
  token: string,
  data: {
    valorCents: number;
    data: string;
    descricao: string;
    referenciaExterna: string;
  },
) {
  const res = await fetch(`${BASE_URL}/api/integracoes/negociar/transacao`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      valor_cents: data.valorCents,
      data: data.data,
      descricao: data.descricao,
      referencia_externa: data.referenciaExterna,
    }),
  });
  if (!res.ok) throw new Error(`AppFinançasBr: ${res.status}`);
}

export async function undoReceivedInAppFinancasBr(
  token: string,
  referenciaExterna: string,
) {
  const res = await fetch(
    `${BASE_URL}/api/integracoes/negociar/transacao?referencia_externa=${referenciaExterna}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`AppFinançasBr: ${res.status}`);
}
