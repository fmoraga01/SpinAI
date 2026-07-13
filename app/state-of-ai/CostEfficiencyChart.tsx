"use client";

import { useMemo, useState } from "react";
import { AiModel, formatIndex, formatPrice } from "@/lib/stateOfAi";

const MARK = "#2C40FF";
const MUTED = "var(--color-border-bright)";
const W = 640;
const H = 320;
const M = { top: 20, right: 16, bottom: 56, left: 34 };

// Artificial Analysis no publica un costo por tarea directo: reporta precio
// blended (mezcla 3:1 entrada/salida) por 1M de tokens. Proyectamos ese precio
// real sobre una tarea de referencia de 1M de tokens combinados —del orden de
// una sesión agéntica larga de codificación— para poder comparar "costo por
// tarea" entre modelos sin inventar una métrica de benchmark que no tenemos.
const REFERENCE_TASK_TOKENS = 1_000_000;

function costPerTask(priceBlended1m: number): number {
  return priceBlended1m * (REFERENCE_TASK_TOKENS / 1_000_000);
}

interface Point {
  id: string;
  model: AiModel;
  cost: number;
  index: number;
}

function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const exp = Math.floor(Math.log10(rough));
  const base = rough / 10 ** exp;
  const niceBase = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
  return niceBase * 10 ** exp;
}

function niceTicks(max: number, count: number): number[] {
  const step = niceStep(max / count);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

function formatTick(v: number): string {
  return v % 1 === 0 ? `$${v}` : `$${v.toFixed(2)}`;
}

function paretoFrontier(points: Point[]): Set<string> {
  const sorted = [...points].sort((a, b) => a.cost - b.cost);
  const frontier = new Set<string>();
  let best = -Infinity;
  for (const p of sorted) {
    if (p.index > best) {
      frontier.add(p.id);
      best = p.index;
    }
  }
  return frontier;
}

export default function CostEfficiencyChart({ models }: { models: AiModel[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const points: Point[] = useMemo(
    () =>
      models
        .filter((m) => m.priceBlended1m !== null && m.priceBlended1m! > 0 && m.intelligenceIndex !== null)
        .map((m) => ({ id: m.id, model: m, cost: costPerTask(m.priceBlended1m!), index: m.intelligenceIndex! })),
    [models]
  );

  if (points.length < 2) return null;

  const frontierIds = paretoFrontier(points);
  const leader = points.reduce((a, b) => (b.index > a.index ? b : a));

  const maxCost = Math.max(...points.map((p) => p.cost));
  const xTicks = niceTicks(maxCost, 5);
  const xMax = xTicks[xTicks.length - 1];

  const minIndex = Math.min(...points.map((p) => p.index));
  const maxIndex = Math.max(...points.map((p) => p.index));
  const yPad = Math.max(2, (maxIndex - minIndex) * 0.18);
  const yMin = Math.max(0, Math.floor((minIndex - yPad) / 5) * 5);
  const yMax = Math.ceil((maxIndex + yPad) / 5) * 5;
  const yTicks = [0, 1, 2, 3, 4].map((i) => Math.round(yMin + ((yMax - yMin) / 4) * i));

  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;

  function xFor(cost: number) {
    return M.left + ((xMax - cost) / xMax) * innerW;
  }
  function yFor(index: number) {
    return M.top + innerH - ((index - yMin) / (yMax - yMin)) * innerH;
  }

  const coords = points.map((p) => ({ ...p, x: xFor(p.cost), y: yFor(p.index) }));
  const frontierCoords = coords.filter((p) => frontierIds.has(p.id)).sort((a, b) => a.x - b.x);
  const frontierPath = frontierCoords.map((p) => `${p.x},${p.y}`).join(" ");
  const leaderCoord = coords.find((p) => p.id === leader.id)!;

  const active = hovered ? coords.find((p) => p.id === hovered) ?? null : null;
  const xTranslate = active ? (active.x < 90 ? "0%" : active.x > W - 90 ? "-100%" : "-50%") : "-50%";
  const showBelow = active ? active.y < 56 : false;

  const ariaLabel = `Gráfico de dispersión: costo estimado por tarea vs índice de inteligencia para ${points.length} modelos. ${frontierCoords.length} modelos forman la frontera de eficiencia, desde ${frontierCoords[0].model.name} (${formatPrice(frontierCoords[0].cost)} por tarea) hasta ${frontierCoords[frontierCoords.length - 1].model.name} (${formatPrice(frontierCoords[frontierCoords.length - 1].cost)} por tarea). Líder en índice: ${leader.model.name} con ${formatIndex(leader.index)} puntos.`;

  return (
    <figure style={{ margin: 0 }}>
      <div style={{ position: "relative", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          role="img"
          aria-label={ariaLabel}
          style={{ display: "block", minWidth: 480, overflow: "visible" }}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={yFor(t)} y2={yFor(t)} stroke="var(--color-border)" strokeWidth={1} />
              <text x={M.left - 8} y={yFor(t)} dy={4} textAnchor="end" fontSize={11} fill="#6B7280" style={{ fontVariantNumeric: "tabular-nums" }}>
                {t}
              </text>
            </g>
          ))}

          {xTicks.map((t) => (
            <text key={t} x={xFor(t)} y={M.top + innerH + 20} textAnchor="middle" fontSize={11} fill="#6B7280" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatTick(t)}
            </text>
          ))}

          <line
            x1={leaderCoord.x}
            x2={leaderCoord.x}
            y1={leaderCoord.y}
            y2={M.top + innerH}
            stroke={MARK}
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.5}
          />
          <line
            x1={M.left}
            x2={leaderCoord.x}
            y1={leaderCoord.y}
            y2={leaderCoord.y}
            stroke={MARK}
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.5}
          />

          <polyline points={frontierPath} fill="none" stroke={MARK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />

          {coords
            .filter((p) => !frontierIds.has(p.id))
            .map((p) => (
              <circle key={p.id} cx={p.x} cy={p.y} r={3} fill={MUTED} opacity={hovered === p.id ? 1 : 0.75} />
            ))}
          {frontierCoords.map((p) => (
            <circle key={p.id} cx={p.x} cy={p.y} r={p.id === leader.id ? 5 : 4} fill={MARK} />
          ))}

          <text
            x={leaderCoord.x}
            y={leaderCoord.y - 12}
            textAnchor={leaderCoord.x > W - 100 ? "end" : "middle"}
            fontSize={11.5}
            fontWeight={600}
            fill={MARK}
          >
            {leader.model.name}
          </text>

          {coords.map((p) => (
            <circle
              key={`hit-${p.id}`}
              cx={p.x}
              cy={p.y}
              r={12}
              fill="transparent"
              tabIndex={0}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(p.id)}
              onBlur={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </svg>

        {active && (
          <div
            role="tooltip"
            style={{
              position: "absolute",
              left: `${(active.x / W) * 100}%`,
              top: active.y,
              transform: `translate(${xTranslate}, ${showBelow ? "12px" : "calc(-100% - 10px)"})`,
              padding: "6px 10px",
              background: "#1A1D2E",
              border: "1px solid var(--color-border-bright)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 8px 16px -6px rgba(0,0,0,0.6)",
              fontSize: 11.5,
              fontWeight: 500,
              color: "#fff",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 20,
            }}
          >
            <strong>{active.model.name}</strong>{" "}
            <span style={{ color: "var(--color-tertiary)" }}>
              · {formatIndex(active.index)} pts · {formatPrice(active.cost)}/tarea
            </span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: "#4B5563" }}>Más caro</span>
        <span style={{ fontSize: 11, color: "#4B5563" }}>Costo estimado por tarea (USD) — más barato hacia la derecha</span>
        <span style={{ fontSize: 11, color: "#4B5563" }}>Más barato</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--color-tertiary)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: MARK, display: "inline-block" }} />
          En la frontera de eficiencia
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--color-tertiary)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: MUTED, display: "inline-block" }} />
          Fuera de la frontera
        </span>
      </div>

      <p style={{ fontSize: 11, color: "#4B5563", margin: "12px 0 0", lineHeight: "16px" }}>
        Estimado para una tarea de referencia de 1M de tokens combinados (mezcla 3:1 entrada/salida), a partir del precio real por token de Artificial Analysis — no es una medición directa por tarea.
      </p>
    </figure>
  );
}
