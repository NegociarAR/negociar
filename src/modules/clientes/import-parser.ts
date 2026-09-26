import { isValidCPF, isValidCNPJ, onlyDigits } from "@/lib/br-validators";

// Cabeçalhos aceitos (case-insensitive, acento-insensitive) -> campo.
const HEADER_MAP: Record<string, string> = {
  nome: "name",
  "razao social": "name",
  "razao/nome": "name",
  cliente: "name",
  tipo: "person_type",
  "cpf/cnpj": "doc",
  cpf: "doc",
  cnpj: "doc",
  documento: "doc",
  telefone: "phone",
  fone: "phone",
  whatsapp: "whatsapp",
  zap: "whatsapp",
  email: "email",
  "e-mail": "email",
  cidade: "city",
  estado: "state",
  uf: "state",
};

function normalizeHeader(h: string): string {
  return h
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface ParsedCustomer {
  person_type: "pf" | "pj";
  name: string;
  cpf: string | null;
  cnpj: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
}

export interface ImportError {
  line: number; // linha na planilha (1 = primeira de dados)
  reason: string;
}

export interface ParseResult {
  valid: ParsedCustomer[];
  errors: ImportError[];
}

// rows: matriz vinda da planilha (primeira linha = cabeçalho).
export function parseCustomerRows(rows: unknown[][]): ParseResult {
  const valid: ParsedCustomer[] = [];
  const errors: ImportError[] = [];

  if (!rows || rows.length < 2) {
    return { valid, errors: [{ line: 0, reason: "Planilha vazia ou sem dados." }] };
  }

  // mapeia colunas pelos cabeçalhos
  const header = rows[0].map((h) => normalizeHeader(String(h ?? "")));
  const colIndex: Record<string, number> = {};
  header.forEach((h, i) => {
    const field = HEADER_MAP[h];
    if (field && !(field in colIndex)) colIndex[field] = i;
  });

  if (!("name" in colIndex)) {
    return {
      valid,
      errors: [{ line: 0, reason: "Coluna de nome não encontrada. Use o modelo." }],
    };
  }

  const cell = (row: unknown[], field: string): string => {
    const idx = colIndex[field];
    if (idx === undefined) return "";
    return String(row[idx] ?? "").trim();
  };

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const lineNo = r; // 1-based nos dados
    if (!row || row.every((c) => String(c ?? "").trim() === "")) continue; // linha vazia

    const name = cell(row, "name");
    if (!name) {
      errors.push({ line: lineNo, reason: "Nome vazio" });
      continue;
    }

    const docRaw = cell(row, "doc");
    const doc = onlyDigits(docRaw);
    let person_type: "pf" | "pj";
    let cpf: string | null = null;
    let cnpj: string | null = null;

    // tipo explícito, senão inferido pelo tamanho do documento
    const typeCell = normalizeHeader(cell(row, "person_type"));
    if (typeCell === "pf" || typeCell === "pj") {
      person_type = typeCell;
    } else if (doc.length === 11) {
      person_type = "pf";
    } else if (doc.length === 14) {
      person_type = "pj";
    } else {
      person_type = "pj"; // padrão
    }

    // valida documento se informado
    if (doc.length > 0) {
      if (person_type === "pf") {
        if (doc.length !== 11 || !isValidCPF(doc)) {
          errors.push({ line: lineNo, reason: `CPF inválido (${name})` });
          continue;
        }
        cpf = doc;
      } else {
        if (doc.length !== 14 || !isValidCNPJ(doc)) {
          errors.push({ line: lineNo, reason: `CNPJ inválido (${name})` });
          continue;
        }
        cnpj = doc;
      }
    }

    const phone = cell(row, "phone") || null;
    const whatsapp = cell(row, "whatsapp") || phone;
    const email = cell(row, "email") || null;
    const city = cell(row, "city") || null;
    const state = cell(row, "state") || null;

    valid.push({
      person_type,
      name,
      cpf,
      cnpj,
      phone,
      whatsapp,
      email,
      city,
      state,
    });
  }

  return { valid, errors };
}
