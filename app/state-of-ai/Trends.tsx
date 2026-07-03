"use client";

import { useMemo } from "react";
import { AiModel, monthlyReleaseCounts } from "@/lib/stateOfAi";

const MARK = "#5B6CFF";
const W = 640;
const H = 180;
const M = { top: 24, right: 12, bottom: 28, left: 12 };

export default function Trends({ models }: { models: AiModel[] }) {
  const data = useMemo(() => monthlyReleaseCounts(models, 6), [models]);
  const max = Math.max(1, ...data.map((d) => d.count));

  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const bandWidth = innerW / data.length;
  const barWidth = Math.min(48, bandWidth * 0.5);

  const growing = data.length >= 2 && data.at(-1)!.count >= data[0].count;

  return (
    <figure style={{ margin: 0 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
        {growing ? "El ritmo de lanzamientos se acelera" : "El ritmo de lanzamientos se mantiene"}
      </h3>
      <p style={{ fontSize: 13, color: "var(--color-tertiary)", margin: "0 0 20px", lineHeight: "19px" }}>
        Modelos nuevos evaluados por Artificial Analysis, por mes de lanzamiento.
      </p>
      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Gráfico de barras: cantidad de modelos lanzados por mes en los últimos 6 meses. ${data.map((d) => `${d.label}: ${d.count}`).join(", ")}.`}
          style={{ width: "100%", minWidth: 420, display: "block" }}
        >
          <line x1={M.left} x2={W - M.right} y1={M.top + innerH} y2={M.top + innerH} stroke="var(--color-border)" strokeWidth={1} />
          {data.map((d, i) => {
            const x = M.left + bandWidth * i + (bandWidth - barWidth) / 2;
            const barH = (d.count / max) * (innerH - 20);
            const y = M.top + innerH - barH;
            return (
              <g key={d.key}>
                {d.count > 0 && (
                  <rect x={x} y={y} width={barWidth} height={barH} rx={4} ry={4} fill={MARK} opacity={0.85} />
                )}
                {d.count > 0 && (
                  <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill="#D1D5DB" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {d.count}
                  </text>
                )}
                <text x={x + barWidth / 2} y={M.top + innerH + 18} textAnchor="middle" fontSize={11} fill="#6B7280" style={{ textTransform: "capitalize" }}>
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
