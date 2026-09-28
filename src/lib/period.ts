// Período e hora no fuso de Brasília (o servidor da Vercel roda em UTC).
const TZ = "America/Sao_Paulo";

// 'YYYY-MM' do mês corrente em Brasília
export function currentPeriod(date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 7);
}

// hora (0-23) em Brasília
export function brtHour(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(date),
  );
}

// data de hoje (YYYY-MM-DD) em Brasília
export function todayBRT(date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: TZ });
}
