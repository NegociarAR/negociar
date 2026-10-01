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
