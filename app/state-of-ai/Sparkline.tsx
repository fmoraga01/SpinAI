const MARK = "#2C40FF";

export default function Sparkline({
  values, width = 250, height = 32, ariaLabel,
}: { values: number[]; width?: number; height?: number; ariaLabel?: string }) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / range) * (height - 8) - 4,
  }));

  const linePath = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M${points.map((p) => `${p.x},${p.y}`).join(" L")} L${width},${height} L0,${height} Z`;
  const lastSegment = points.slice(-3).map((p) => `${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role={ariaLabel ? "img" : "presentation"}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      style={{ display: "block", overflow: "visible" }}
    >
      <path d={areaPath} fill={MARK} opacity={0.08} />
      <polyline points={linePath} fill="none" stroke="var(--color-border-bright)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={lastSegment} fill="none" stroke={MARK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={5} fill="var(--color-surface-elevated)" />
      <circle cx={last.x} cy={last.y} r={3.5} fill={MARK} />
    </svg>
  );
}
