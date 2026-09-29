// Tipos puros do faturamento por hora (sem next/headers) — seguros para client components.

export interface HourEntry {
  id: string;
  entry_date: string; // YYYY-MM-DD
  hours: number;
  description: string | null;
}

export interface MonthGroup {
  period: string; // YYYY-MM
  hours: number;
  entries: HourEntry[];
  invoiced: boolean;
  invoiceTotalCents: number | null;
  invoiceStatus: "pending" | "received" | "overdue" | null;
}
