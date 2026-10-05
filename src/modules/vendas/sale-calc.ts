// Núcleo de fechamento de venda. Tudo em centavos.

export interface SaleInput {
  grossCents: number;        // valor bruto (do orçamento)
  discountPercent: number;   // desconto em %
  discountCents: number;     // OU desconto em R$ (o que for informado)
  downPaymentCents: number;  // entrada
  installments: number;      // nº de parcelas (fora a entrada)
  firstDueDate: string;      // YYYY-MM-DD (vencimento da 1ª parcela)
}

export interface InstallmentRow {
  number: number;   // 0 = entrada; 1..N = parcelas
  dueDate: string;  // YYYY-MM-DD
  amountCents: number;
}

export interface SaleComputed {
  ok: boolean;
  reason?: string;
  discountCents: number; // desconto efetivo aplicado
  netCents: number;      // líquido = bruto - desconto
  rows: InstallmentRow[];
}

// desconto efetivo: usa % se informado (>0); senão o valor em R$.
function effectiveDiscount(gross: number, pct: number, val: number): number {
  if (pct > 0) return Math.round(gross * (pct / 100));
  return Math.min(val, gross);
}

// adiciona N meses a uma data YYYY-MM-DD, preservando fim de mês.
function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${base.getFullYear()}-${mm}-${dd}`;
}

export function computeSale(input: SaleInput): SaleComputed {
  const { grossCents, discountPercent, discountCents, downPaymentCents } = input;
  const n = Math.max(1, Math.floor(input.installments));

  // valores negativos não fazem sentido: desconto negativo viraria acréscimo
  // e entrada negativa quebraria a soma das parcelas.
  if (discountPercent < 0 || discountCents < 0 || downPaymentCents < 0) {
    return { ok: false, reason: "Desconto e entrada não podem ser negativos.", discountCents: 0, netCents: 0, rows: [] };
  }

  const disc = effectiveDiscount(grossCents, discountPercent, discountCents);
  const net = grossCents - disc;

  if (net < 0) {
    return { ok: false, reason: "Desconto maior que o valor.", discountCents: disc, netCents: 0, rows: [] };
  }
  if (downPaymentCents > net) {
    return { ok: false, reason: "Entrada maior que o valor líquido.", discountCents: disc, netCents: net, rows: [] };
  }
  if (!input.firstDueDate) {
    return { ok: false, reason: "Informe a data da primeira parcela.", discountCents: disc, netCents: net, rows: [] };
  }

  const rows: InstallmentRow[] = [];

  // entrada (número 0), vencendo na data base
  if (downPaymentCents > 0) {
    rows.push({ number: 0, dueDate: input.firstDueDate, amountCents: downPaymentCents });
  }

  // valor a parcelar
  const toSplit = net - downPaymentCents;
  const base = Math.floor(toSplit / n);
  let remainder = toSplit - base * n; // centavos a distribuir

  // nada a parcelar (entrada = líquido, ou venda de R$ 0): não gera parcelas
  // de R$ 0,00, que poluiriam Recebíveis e disparariam cobranças vazias.
  for (let i = 1; toSplit > 0 && i <= n; i++) {
    let amount = base;
    if (remainder > 0) {
      amount += 1;
      remainder -= 1;
    }
    // se há entrada, a 1ª parcela vence 1 mês após a base; senão na base
    const monthsOffset = downPaymentCents > 0 ? i : i - 1;
    rows.push({
      number: i,
      dueDate: addMonths(input.firstDueDate, monthsOffset),
      amountCents: amount,
    });
  }

  return { ok: true, discountCents: disc, netCents: net, rows };
}
