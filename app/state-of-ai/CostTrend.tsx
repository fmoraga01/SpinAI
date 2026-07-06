import { AiModel, costOfIntelligenceTrend } from "@/lib/stateOfAi";

const MARK = "#2C40FF";
const DOWN = "#F0A868";
const W = 200;
const H = 60;

function sparklinePoints(values: number[]): { x: number; y: number }[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = W / (values.length - 1);
  return values.map((v, i) => ({
    x: i * stepX,
    y: H - ((v - min) / range) * (H - 10) - 4,
  }));
}

export default function CostTrend({ models }: { models: AiModel[] }) {
  const trend = costOfIntelligenceTrend(models);
  if (trend.length < 6) return null;

  const half = Math.floor(trend.length / 2);
  const oldAvg = trend.slice(0, half).reduce((sum, p) => sum + p.costPerPoint, 0) / half;
  const newAvg = trend.slice(half).reduce((sum, p) => sum + p.costPerPoint, 0) / (trend.length - half);
  const pctChange = ((newAvg - oldAvg) / oldAvg) * 100;
  const improving = pctChange < 0;
  const color = improving ? MARK : DOWN;

  const points = sparklinePoints(trend.map((p) => p.costPerPoint));
  const linePath = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M${points.map((p) => `${p.x},${p.y}`).join(" L")} L${W},${H} L0,${H} Z`;
  const lastSegment = points.slice(-3).map((p) => `${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];

  return (
    <div
      className="hidden md:flex"
      style={{
        flexShrink: 0,
        width: 208,
        paddingLeft: 32,
        borderLeft: "1px solid var(--color-border)",
        alignSelf: "stretch",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-tertiary)", margin: "0 0 10px" }}>
        Costo por punto de inteligencia
      </p>
      <p style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: "-0.01em", margin: "0 0 2px" }}>
        {pctChange > 0 ? "+" : ""}
        {pctChange.toFixed(0)}%
      </p>
      <p style={{ fontSize: 11, color: "var(--color-tertiary)", margin: "0 0 14px", lineHeight: "15px" }}>
        en los últimos {trend.length} lanzamientos
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`Costo por punto de índice de inteligencia: ${improving ? "bajó" : "subió"} ${Math.abs(pctChange).toFixed(0)}% en los últimos ${trend.length} modelos lanzados.`}
        style={{ display: "block", overflow: "visible" }}
      >
        <path d={areaPath} fill={MARK} opacity={0.08} />
        <polyline points={linePath} fill="none" stroke="var(--color-border-bright)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={lastSegment} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last.x} cy={last.y} r={6} fill="#141724" />
        <circle cx={last.x} cy={last.y} r={4} fill={color} />
      </svg>
    </div>
  );
}
