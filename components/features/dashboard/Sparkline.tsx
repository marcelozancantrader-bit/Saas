type Props = {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Sparkline SVG mínimo — área sob a curva + linha. Sem dependência de lib.
 */
export function Sparkline({ data, width = 240, height = 48, className }: Props) {
  if (data.length === 0) return null;

  const max = Math.max(1, ...data);
  const stepX = width / Math.max(1, data.length - 1);

  function pointAt(idx: number, value: number): [number, number] {
    const x = idx * stepX;
    const y = height - (value / max) * (height - 4) - 2;
    return [x, y];
  }

  const points = data.map((v, i) => pointAt(i, v));
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${(points[points.length - 1]?.[0] ?? 0).toFixed(2)},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={`Tendência dos últimos ${data.length} dias`}
    >
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-grad)" className="text-blue-500" />
      <path d={linePath} fill="none" strokeWidth={1.5} className="stroke-blue-600" />
    </svg>
  );
}
