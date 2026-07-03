"use client";

import { useMemo } from "react";
import { AiModel, formatIndex, formatPrice } from "@/lib/stateOfAi";

const MARK = "#5B6CFF";
const TOP_N = 10;

interface Row {
  model: AiModel;
  score: number;
}

export default function ValueLeaderboard({ models }: { models: AiModel[] }) {
  const rows = useMemo<Row[]>(() => {
    const usable = models.filter(
      (m) => m.intelligenceIndex !== null && m.priceBlended1m !== null && m.priceBlended1m! > 0
    );
    return usable
      .map((m) => ({ model: m, score: m.intelligenceIndex! / m.priceBlended1m! }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N);
  }, [models]);

  if (rows.length === 0) return null;
  const maxScore = rows[0].score;

  return (
    <figure style={{ margin: 0 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
        ¿Qué modelo da más inteligencia por dólar?
      </h3>
      <p style={{ fontSize: 13, color: "var(--color-tertiary)", margin: "0 0 22px", lineHeight: "19px" }}>
        Ranking por puntos de índice de inteligencia obtenidos por cada dólar pagado (por 1M de tokens).
        No es &ldquo;el mejor modelo&rdquo; — es el que más rinde frente a lo que cuesta.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map((r, i) => (
          <div key={r.model.id}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 5 }}>
              <span style={{ fontSize: 13.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ color: "#4B5563", fontVariantNumeric: "tabular-nums", marginRight: 8 }}>{i + 1}</span>
                <strong style={{ color: "#fff", fontWeight: 600 }}>{r.model.name}</strong>
                <span style={{ color: "var(--color-tertiary)" }}> · {r.model.creatorName}</span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: MARK, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                {r.score.toFixed(1)}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "var(--color-border)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: 4,
                  background: MARK,
                  width: `${(r.score / maxScore) * 100}%`,
                }}
              />
            </div>
            <p style={{ fontSize: 11.5, color: "#4B5563", margin: "5px 0 0" }}>
              Índice {formatIndex(r.model.intelligenceIndex)} · {formatPrice(r.model.priceBlended1m)}/1M tokens
            </p>
          </div>
        ))}
      </div>
    </figure>
  );
}
