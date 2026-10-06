// Tipos puros do faturamento por hora (sem next/headers) — seguros para client components.

export interface HourEntry {
  id: string;
  entry_date: string; // YYYY-MM-DD
  hours: number;
  description: string | null;
  sale_id: string | null;
  summaryStatus: "pending" | "approved" | "contested" | null;
}

export interface MonthGroup {
  period: string; // YYYY-MM
  hours: number;
  entries: HourEntry[];
}

export interface HourSummary {
  id: string;
  token: string;
  status: "pending" | "approved" | "contested";
  hours: number;
  totalCents: number;
  createdAt: string;
}
