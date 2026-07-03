"use client";

import { useMemo, useState } from "react";
import { AiModel, formatIndex, formatPrice, formatReleaseDate } from "@/lib/stateOfAi";

const MARK = "#5B6CFF";

type SortKey = "intelligence" | "price" | "speed" | "release";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "intelligence", label: "Inteligencia" },
  { key: "price", label: "Precio $/1M" },
  { key: "speed", label: "Velocidad" },
  { key: "release", label: "Lanzamiento" },
];

function sortValue(m: AiModel, key: SortKey): number {
  switch (key) {
    case "intelligence": return m.intelligenceIndex ?? -Infinity;
    case "price": return m.priceBlended1m ?? Infinity;
    case "speed": return m.tokensPerSecond ?? -Infinity;
    case "release": return m.releaseDate ? new Date(m.releaseDate).getTime() : -Infinity;
  }
}

interface RankingProps {
  models: AiModel[];
  selectedIds: string[];
  onToggleCompare: (id: string) => void;
}

export default function Ranking({ models, selectedIds, onToggleCompare }: RankingProps) {
  const [sortKey, setSortKey] = useState<SortKey>("intelligence");
  const [ascending, setAscending] = useState(false);
  const [creatorFilter, setCreatorFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const creators = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of models.slice(0, 40)) {
      if (m.creatorName) counts.set(m.creatorName, (counts.get(m.creatorName) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([name]) => name);
  }, [models]);

  const maxIntelligence = useMemo(
    () => Math.max(...models.map((m) => m.intelligenceIndex ?? 0)),
    [models]
  );

  const rows = useMemo(() => {
    const filtered = creatorFilter ? models.filter((m) => m.creatorName === creatorFilter) : models;
    const sorted = [...filtered].sort((a, b) => {
      const diff = sortValue(a, sortKey) - sortValue(b, sortKey);
      return ascending ? diff : -diff;
    });
    return expanded ? sorted : sorted.slice(0, 12);
  }, [models, creatorFilter, sortKey, ascending, expanded]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setAscending(!ascending);
    } else {
      setSortKey(key);
      setAscending(key === "price"); // precio: ascendente por defecto (más barato primero)
    }
  }

  const thStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--color-tertiary)",
    padding: "10px 12px",
    textAlign: "right",
    whiteSpace: "nowrap",
  };

  return (
    <div>
      {/* Filtro por proveedor */}
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 16 }}>
        {[null, ...creators].map((c) => {
          const active = creatorFilter === c;
          return (
            <button
              key={c ?? "all"}
              onClick={() => setCreatorFilter(c)}
              aria-pressed={active}
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "5px 11px",
                borderRadius: "var(--radius-md)",
                color: active ? "#fff" : "var(--color-tertiary)",
                background: active ? "#2C40FF22" : "transparent",
                border: "1px solid " + (active ? "#2C40FF55" : "var(--color-border)"),
                cursor: "pointer",
              }}
            >
              {c ?? "Todos"}
            </button>
          );
        })}
      </div>

      <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr style={{ background: "var(--color-surface-elevated)", borderBottom: "1px solid var(--color-border)" }}>
              <th style={{ ...thStyle, textAlign: "left", width: 36 }}>#</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Modelo</th>
              {COLUMNS.map(({ key, label }) => {
                const active = sortKey === key;
                return (
                  <th key={key} style={{ ...thStyle, padding: 0 }} aria-sort={active ? (ascending ? "ascending" : "descending") : "none"}>
                    <button
                      onClick={() => handleSort(key)}
                      style={{
                        font: "inherit",
                        color: active ? "#fff" : "inherit",
                        letterSpacing: "inherit",
                        textTransform: "inherit",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "10px 12px",
                        width: "100%",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label} {active ? (ascending ? "↑" : "↓") : ""}
                    </button>
                  </th>
                );
              })}
              <th style={{ ...thStyle, textAlign: "center" }}>Comparar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => {
              const selected = selectedIds.includes(m.id);
              const compareDisabled = !selected && selectedIds.length >= 4;
              return (
                <tr key={m.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "10px 12px", fontSize: 12.5, color: "#4B5563", fontVariantNumeric: "tabular-nums" }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", margin: 0 }}>{m.name}</p>
                    <p style={{ fontSize: 11.5, color: "var(--color-tertiary)", margin: "1px 0 0" }}>{m.creatorName}</p>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                        {formatIndex(m.intelligenceIndex)}
                      </span>
                      <span style={{ width: 64, height: 4, borderRadius: 4, background: "var(--color-border)", display: "inline-block", overflow: "hidden" }}>
                        <span
                          style={{
                            display: "block",
                            height: "100%",
                            borderRadius: 4,
                            background: MARK,
                            width: `${((m.intelligenceIndex ?? 0) / maxIntelligence) * 100}%`,
                          }}
                        />
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                    {formatPrice(m.priceBlended1m)}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                    {m.tokensPerSecond === null ? "—" : `${Math.round(m.tokensPerSecond)} tok/s`}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 12.5, color: "var(--color-tertiary)", whiteSpace: "nowrap" }}>
                    {formatReleaseDate(m.releaseDate)}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <button
                      onClick={() => onToggleCompare(m.id)}
                      disabled={compareDisabled}
                      aria-pressed={selected}
                      title={compareDisabled ? "Máximo 4 modelos" : selected ? "Quitar de la comparación" : "Agregar a la comparación"}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--radius-md)",
                        fontSize: 14,
                        fontWeight: 600,
                        color: selected ? "#fff" : "var(--color-primary)",
                        background: selected ? "var(--color-primary)" : "transparent",
                        border: "1px solid " + (selected ? "var(--color-primary)" : "#2C40FF55"),
                        cursor: compareDisabled ? "not-allowed" : "pointer",
                        opacity: compareDisabled ? 0.35 : 1,
                      }}
                    >
                      {selected ? "✓" : "+"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!expanded && models.length > 12 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button
            onClick={() => setExpanded(true)}
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: "8px 18px",
              borderRadius: "var(--radius-md)",
              color: "var(--color-primary)",
              background: "transparent",
              border: "1px solid var(--color-primary)",
              cursor: "pointer",
            }}
          >
            Ver todos los modelos ({models.length})
          </button>
        </div>
      )}
    </div>
  );
}
