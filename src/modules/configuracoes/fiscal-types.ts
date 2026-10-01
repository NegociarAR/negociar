export interface FiscalAddress {
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  ibgeCityCode: string;
}

export interface FiscalSettings {
  onboardingStatus: "not_started" | "pending" | "active" | "error";
  onboardingError: string | null;
  environment: "homologacao" | "producao";
  municipalServiceCode: string | null;
  cnaeCode: string | null;
  taxRegime: "mei" | "simples_nacional" | "lucro_presumido" | "lucro_real" | null;
  issRate: number | null;
  municipalRegistration: string | null;
  address: FiscalAddress;
  autoIssue: boolean;
}
