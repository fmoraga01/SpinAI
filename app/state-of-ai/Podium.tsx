"use client";

import { useState } from "react";
import { AiModel } from "@/lib/stateOfAi";

const MARK = "#2C40FF";
const TIGHT_THRESHOLD = 5; // puntos de índice — por debajo de esto, el podio se lee "reñido"

export default function Podium({ models }: { models: AiModel[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const top = models.slice(0, 5);
  if (top.length < 3) return null;

  const max = top[0].intelligenceIndex!;
  const spread = max - top[top.length - 1].intelligenceIndex!;
  const tight = spread <= TIGHT_THRESHOLD;

  return (
    <div
      className="hidden md:flex"
      style={{
        flexShrink: 0,
        width: 310,
        paddingLeft: 32,
        borderLeft: "1px solid var(--color-border)",
        alignSelf: "stretch",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-tertiary)", margin: "0 0 12px" }}>
        Top {top.length} · Índice de inteligencia
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {top.map((m, i) => {
          const isLeader = i === 0;
          const pct = Math.max(6, (m.intelligenceIndex! / max) * 100);
          return (
            <div
              key={m.id}
              tabIndex={0}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}
            >
              {hovered === i && (
                <span
                  role="tooltip"
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 6px)",
                    left: 18,
                    padding: "5px 9px",
                    background: "#1A1D2E",
                    border: "1px solid var(--color-border-bright)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "0 8px 16px -6px rgba(0,0,0,0.6)",
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: "#fff",
                    whiteSpace: "nowrap",
                    zIndex: 20,
                    pointerEvents: "none",
                  }}
                >
                  {m.name}
                </span>
              )}
              <span style={{ width: 10, fontSize: 10.5, color: "var(--color-tertiary)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                {i + 1}
              </span>
              <div style={{ flex: 1, height: 6, borderRadius: 4, background: "var(--color-border)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 4,
                    width: `${pct}%`,
                    background: isLeader ? MARK : "var(--color-border-bright)",
                  }}
                />
              </div>
              <span
                style={{
                  width: 30,
                  fontSize: 10.5,
                  fontWeight: isLeader ? 600 : 400,
                  color: isLeader ? MARK : "var(--color-tertiary)",
                  textAlign: "right",
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {m.intelligenceIndex!.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: "var(--color-tertiary)", margin: 0, lineHeight: "15px" }}>
        {tight
          ? `Podio reñido: solo ${spread.toFixed(1)} puntos separan al 1° del ${top.length}°.`
          : `El líder saca ${spread.toFixed(1)} puntos al ${top.length}° lugar.`}
      </p>
    </div>
  );
}
