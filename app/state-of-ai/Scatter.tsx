"use client";

import { useMemo, useState } from "react";
import { AiModel, formatIndex, formatPrice } from "@/lib/stateOfAi";

const MARK = "#5B6CFF"; // paso claro del azul de marca, validado ≥3:1 sobre la superficie

const M = { top: 24, right: 120, bottom: 48, left: 52 };
const W = 760;
const H = 420;

interface Point {
  model: AiModel;
  x: number;
  y: number;
  onFrontier: boolean;
}

// Frontera de eficiencia: modelos sin otro más barato e igual o más inteligente.
function paretoFrontier(models: AiModel[]): Set<string> {
  const sorted = [...models].sort((a, b) => a.priceBlended1m! - b.priceBlended1m!);
  const frontier = new Set<string>();
  let maxIntelligence = -Infinity;
  for (const m of sorted) {
    if (m.intelligenceIndex! > maxIntelligence) {
      maxIntelligence = m.intelligenceIndex!;
      frontier.add(m.id);
    }
  }
  return frontier;
}

export default function Scatter({ models }: { models: AiModel[] }) {
  const [hovered, setHovered] = useState<Point | null>(null);

  const plot = useMemo(() => {
    const usable = models.filter(
      (m) => m.intelligenceIndex !== null && m.priceBlended1m !== null && m.priceBlended1m! > 0
    );
    if (usable.length < 3) return null;

    const prices = usable.map((m) => m.priceBlended1m!);
    const indices = usable.map((m) => m.intelligenceIndex!);
    const logMin = Math.log10(Math.min(...prices) * 0.8);
    const logMax = Math.log10(Math.max(...prices) * 1.25);
    const yMin = Math.max(0, Math.floor((Math.min(...indices) - 6) / 10) * 10);
    const yMax = Math.ceil((Math.max(...indices) + 4) / 10) * 10;

    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;
    const x = (p: number) => M.left + ((Math.log10(p) - logMin) / (logMax - logMin)) * innerW;
    const y = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

    const frontier = paretoFrontier(usable);
    const points: Point[] = usable.map((m) => ({
      model: m,
      x: x(m.priceBlended1m!),
      y: y(m.intelligenceIndex!),
      onFrontier: frontier.has(m.id),
    }));

    const xTicks = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50, 100].filter(
      (t) => Math.log10(t) >= logMin && Math.log10(t) <= logMax
    );
    const yTicks: number[] = [];
    const step = yMax - yMin > 60 ? 20 : 10;
    for (let v = yMin; v <= yMax; v += step) yTicks.push(v);

    // Etiquetas directas solo en la frontera (máx 7), el resto queda atenuado con tooltip
    const labeled = points
      .filter((p) => p.onFrontier)
      .sort((a, b) => b.model.intelligenceIndex! - a.model.intelligenceIndex!)
      .slice(0, 7);

    return { points, xTicks, yTicks, x, y, labeled };
  }, [models]);

  if (!plot) return null;

  return (
    <figure style={{ margin: 0 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
        ¿Qué modelo ofrece más inteligencia por dólar?
      </h3>
      <p style={{ fontSize: 13, color: "var(--color-tertiary)", margin: "0 0 20px", lineHeight: "19px" }}>
        Índice de inteligencia vs. precio combinado por 1M de tokens (escala logarítmica). Los modelos
        destacados forman la frontera de eficiencia: nadie es más barato siendo igual de inteligente.
      </p>
      <div style={{ position: "relative", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Gráfico de dispersión de inteligencia versus precio. Los modelos de la frontera de eficiencia están etiquetados; la tabla del ranking contiene los mismos datos."
          style={{ width: "100%", minWidth: 560, display: "block" }}
        >
          {/* Grid horizontal */}
          {plot.yTicks.map((v) => (
            <g key={v}>
              <line
                x1={M.left} x2={W - M.right} y1={plot.y(v)} y2={plot.y(v)}
                stroke="var(--color-border)" strokeWidth={1}
              />
              <text x={M.left - 8} y={plot.y(v) + 4} textAnchor="end" fontSize={11} fill="#6B7280">
                {v}
              </text>
            </g>
          ))}
          {/* Ticks X */}
          {plot.xTicks.map((t) => (
            <text key={t} x={plot.x(t)} y={H - M.bottom + 20} textAnchor="middle" fontSize={11} fill="#6B7280">
              ${t}
            </text>
          ))}
          <text x={M.left + (W - M.left - M.right) / 2} y={H - 8} textAnchor="middle" fontSize={11.5} fill="#9CA3AF">
            Precio por 1M tokens (USD, log) — más barato a la izquierda
          </text>
          <text
            x={14} y={M.top + (H - M.top - M.bottom) / 2} textAnchor="middle" fontSize={11.5} fill="#9CA3AF"
            transform={`rotate(-90 14 ${M.top + (H - M.top - M.bottom) / 2})`}
          >
            Índice de inteligencia
          </text>

          {/* Anotación del cuadrante de mejor valor */}
          <text x={M.left + 6} y={M.top + 14} fontSize={11.5} fill="#9CA3AF" fontStyle="italic">
            ↖ Mejor valor: arriba a la izquierda
          </text>

          {/* Puntos atenuados */}
          {plot.points.filter((p) => !p.onFrontier).map((p) => (
            <circle
              key={p.model.id}
              cx={p.x} cy={p.y} r={4.5}
              fill={MARK} opacity={0.3}
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {/* Frontera enfatizada, con anillo de superficie */}
          {plot.points.filter((p) => p.onFrontier).map((p) => (
            <circle
              key={p.model.id}
              cx={p.x} cy={p.y} r={5.5}
              fill={MARK} stroke="var(--color-surface)" strokeWidth={2}
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {/* Etiquetas directas de la frontera */}
          {plot.labeled.map((p) => (
            <text
              key={p.model.id}
              x={p.x + 9} y={p.y + 4}
              fontSize={11.5} fontWeight={600} fill="#D1D5DB"
              style={{ pointerEvents: "none" }}
            >
              {p.model.name}
            </text>
          ))}
        </svg>

        {hovered && (
          <div
            style={{
              position: "absolute",
              left: `${(hovered.x / W) * 100}%`,
              top: `${(hovered.y / H) * 100}%`,
              transform: "translate(12px, -50%)",
              background: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "8px 12px",
              pointerEvents: "none",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              whiteSpace: "nowrap",
              zIndex: 5,
            }}
          >
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", margin: 0 }}>{hovered.model.name}</p>
            <p style={{ fontSize: 11.5, color: "var(--color-tertiary)", margin: "2px 0 0" }}>
              {hovered.model.creatorName} · Índice {formatIndex(hovered.model.intelligenceIndex)} ·{" "}
              {formatPrice(hovered.model.priceBlended1m)}/1M
            </p>
          </div>
        )}
      </div>
    </figure>
  );
}
