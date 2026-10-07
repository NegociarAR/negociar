export interface AsaasClientSettings {
  enabled: boolean;
  environment: "sandbox" | "producao";
  apiKeyMasked: string | null;
  webhookUrl: string;
}
