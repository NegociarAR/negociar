export interface FiscalSettings {
  enabled: boolean;
  autoIssue: boolean;
  environment: "homologacao" | "producao";
  hasToken: boolean; // nunca devolvemos o token em si pro client, só se existe
  municipalServiceCode: string | null;
  cnaeCode: string | null;
  taxRegime: "mei" | "simples_nacional" | "lucro_presumido" | "lucro_real" | null;
  issRate: number | null;
}
