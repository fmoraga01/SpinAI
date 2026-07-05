"use client";

import { useMemo } from "react";
import { AiModel, formatIndex, formatPrice } from "@/lib/stateOfAi";

function monthLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

interface Group {
  key: string;
  label: string;
  items: AiModel[];
}

export default function Timeline({ models }: { models: AiModel[] }) {
  const groups = useMemo<Group[]>(() => {
    const withDate = models
      .filter((m) => m.releaseDate)
      .sort((a, b) => b.releaseDate!.localeCompare(a.releaseDate!))
      .slice(0, 30); // los 30 lanzamientos más recientes — un hito reciente, no el histórico completo

    const map = new Map<string, Group>();
    for (const m of withDate) {
      const key = m.releaseDate!.slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, { key, label: monthLabel(m.releaseDate!), items: [] });
      map.get(key)!.items.push(m);
    }
    return Array.from(map.values());
  }, [models]);

  if (groups.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {groups.map((group, gi) => (
        <div key={group.key} style={{ display: "flex", gap: 20 }}>
          {/* Riel de tiempo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 12 }}>
            <div
              style={{
                width: 10, height: 10, borderRadius: "50%", marginTop: 6,
                background: "#5B6CFF22", border: "1px solid #5B6CFF66", flexShrink: 0,
              }}
            />
            {gi < groups.length - 1 && (
              <div style={{ width: 1, flex: 1, background: "var(--color-border)", margin: "6px 0" }} />
            )}
          </div>

          {/* Contenido del mes */}
          <div style={{ flex: 1, minWidth: 0, paddingBottom: gi < groups.length - 1 ? 28 : 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-tertiary)", textTransform: "capitalize", margin: "0 0 10px" }}>
              {group.label}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {group.items.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 14px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", margin: 0 }}>{m.name}</p>
                    <p style={{ fontSize: 11.5, color: "var(--color-tertiary)", margin: "1px 0 0" }}>{m.creatorName}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-primary)", background: "#2C40FF15", border: "1px solid #2C40FF33", borderRadius: "var(--radius-md)", padding: "2px 7px", fontVariantNumeric: "tabular-nums" }}>
                      Índice de inteligencia {formatIndex(m.intelligenceIndex)}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--color-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                      {formatPrice(m.priceBlended1m)}/1M tokens
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
