// Gráfico de linha minimalista em SVG puro — sem lib, sem client component
// (é estático, calculado no servidor). Para dar o "subindo ou caindo" de
// relance, não para leitura precisa (isso fica em Relatórios).
export function Sparkline({
  points,
  width = 220,
  height = 44,
}: {
  points: number[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const pad = 4;

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - pad - ((p - min) / range) * (height - pad * 2);
    return { x, y };
  });
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${coords[coords.length - 1].x.toFixed(1)},${height} L0,${height} Z`;
  const last = coords[coords.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={areaPath} fill="currentColor" className="text-primary/10" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
      <circle cx={last.x} cy={last.y} r="3" className="fill-primary" />
    </svg>
  );
}
