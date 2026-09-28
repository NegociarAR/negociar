// Utilitários de data (YYYY-MM-DD), puros e sem fuso: o "hoje" vem de todayBRT().
export function diffDays(a: string, b: string): number {
  const t = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((t(a) - t(b)) / 86400000);
}
export function addDays(iso: string, n: number): string {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n));
  return d.toISOString().slice(0, 10);
}
export function fmtDay(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}
