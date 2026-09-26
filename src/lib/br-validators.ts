// Validação de dígitos verificadores + máscaras. Puros, sem dependências.

export function onlyDigits(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

// ---------- CPF ----------
export function isValidCPF(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais

  const dv = (base: string, factor: number) => {
    let sum = 0;
    for (const d of base) sum += Number(d) * factor--;
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(cpf.slice(0, 9), 10);
  const d2 = dv(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

export function maskCPF(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

// ---------- CNPJ ----------
export function isValidCNPJ(input: string): boolean {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const dv = (base: string) => {
    const weights =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += Number(base[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(cnpj.slice(0, 12));
  const d2 = dv(cnpj.slice(0, 13));
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

export function maskCNPJ(input: string): string {
  const d = onlyDigits(input).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

// ---------- CEP ----------
export function isValidCEP(input: string): boolean {
  return onlyDigits(input).length === 8;
}

export function maskCEP(input: string): string {
  const d = onlyDigits(input).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}
