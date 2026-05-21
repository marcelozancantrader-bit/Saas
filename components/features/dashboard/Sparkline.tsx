type Props = {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  /** Tailwind text-* color (controla stroke e gradient via currentColor). */
  colorClassName?: string;
};

/**
 * Sparkline SVG com área gradient + linha + dot final destacado.
 * Usa currentColor pra herdar do `colorClassName` ou contexto.
 */
export function Sparkline({
  data,
  width = 240,
  height = 64,
  className,
  colorClassName = "text-blue-500",
}: Props) {
  if (data.length === 0) return null;

  const max = Math.max(1, ...data);
  const stepX = width / Math.max(1, data.length - 1);

  function pointAt(idx: number, value: number): [number, number] {
    const x = idx * stepX;
    const y = height - (value / max) * (height - 6) - 3;
    return [x, y];
  }

  const points = data.map((v, i) => pointAt(i, v));
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${(points[points.length - 1]?.[0] ?? 0).toFixed(2)},${height} L0,${height} Z`;
  const lastPoint = points[points.length - 1];

  // Gradiente único por instância — hash determinístico dos dados pra evitar Math.random impuro
  const hash = data.reduce((acc, v, i) => acc + v * (i + 1), 0).toString(36);
  const gradId = `spark-grad-${hash}-${data.length}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={`${colorClassName} ${className ?? ""}`}
      role="img"
      aria-label={`Tendência dos últimos ${data.length} dias`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" strokeWidth={2} stroke="currentColor" />
      {lastPoint && (
        <>
          <circle cx={lastPoint[0]} cy={lastPoint[1]} r={4} fill="currentColor" opacity="0.2" />
          <circle cx={lastPoint[0]} cy={lastPoint[1]} r={2.5} fill="currentColor" />
        </>
      )}
    </svg>
  );
}
