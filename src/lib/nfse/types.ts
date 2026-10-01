// Tipos do fluxo de emissão de NFS-e — isolados do provedor específico
// (hoje Focus NFe), para trocar de provedor no futuro sem reescrever
// o resto do app.

export interface InvoiceRequest {
  ref: string; // referência única (idempotência) — usamos o id do registro local
  environment: "homologacao" | "producao";
  apiToken: string;
  serviceDescription: string;
  serviceValueCents: number;
  municipalServiceCode: string;
  issRate: number | null;
  taxRegime: "mei" | "simples_nacional" | "lucro_presumido" | "lucro_real";
  customer: {
    name: string;
    email: string | null;
    document: string | null; // CPF ou CNPJ, só dígitos
    isCompany: boolean;
  };
}

export interface InvoiceResult {
  ok: boolean;
  status: "processing" | "issued" | "error";
  nfseNumber?: string;
  verificationCode?: string;
  pdfUrl?: string;
  errorMessage?: string;
}

// Cadastro da empresa como emitente na Focus NFe — feito pelo NEGOCIAR,
// usando o token de REVENDA (nunca o da empresa, que ainda não existe
// neste ponto). O certificado chega como base64 e a senha em texto puro
// só para esta chamada — nenhum dos dois é armazenado em lugar nenhum
// do NEGOCIAR, nem antes nem depois desta função.
export interface CompanyRegistration {
  cnpj: string;
  legalName: string;
  tradeName: string;
  email: string;
  municipalRegistration: string;
  taxRegime: "mei" | "simples_nacional" | "lucro_presumido" | "lucro_real";
  address: {
    street: string;
    number: string;
    complement: string | null;
    district: string;
    city: string;
    state: string;
    zipCode: string;
    ibgeCityCode: string;
  };
  certificateBase64: string;
  certificatePassword: string;
}

export interface CompanyRegistrationResult {
  ok: boolean;
  focusCompanyId?: string;
  apiToken?: string; // token "revendido" específico desta empresa, devolvido pelo cadastro
  errorMessage?: string;
}
