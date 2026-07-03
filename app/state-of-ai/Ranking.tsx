"use client";

import { useMemo, useRef, useState } from "react";
import { AiModel, formatIndex, formatPrice, formatReleaseDate } from "@/lib/stateOfAi";
import { usePrefersReducedMotion } from "./useReducedMotion";
import Comparator from "./Comparator";

const MARK = "#5B6CFF";
const PAGE_SIZE = 15;

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

function shortName(name: string): string {
  return name.length > 22 ? name.slice(0, 20) + "…" : name;
}

// Ventana compacta de números de página con elipsis: 1 … 4 5 [6] 7 8 … 20
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const set = new Set([0, total - 1, current - 1, current, current + 1]);
  const nums = Array.from(set).filter((n) => n >= 0 && n < total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = -2;
  for (const n of nums) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

interface RankingProps {
  models: AiModel[];
  selectedIds: string[];
  onToggleCompare: (id: string) => void;
  onSelectPreset: (ids: string[]) => void;
}

export default function Ranking({ models, selectedIds, onToggleCompare, onSelectPreset }: RankingProps) {
  const [sortKey, setSortKey] = useState<SortKey>("intelligence");
  const [ascending, setAscending] = useState(false);
  const [creatorFilter, setCreatorFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const comparatorRef = useRef<HTMLDivElement>(null);

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

  const sortedFiltered = useMemo(() => {
    const filtered = creatorFilter ? models.filter((m) => m.creatorName === creatorFilter) : models;
    return [...filtered].sort((a, b) => {
      const diff = sortValue(a, sortKey) - sortValue(b, sortKey);
      return ascending ? diff : -diff;
    });
  }, [models, creatorFilter, sortKey, ascending]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const rows = sortedFiltered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setAscending(!ascending);
    } else {
      setSortKey(key);
      setAscending(key === "price"); // precio: ascendente por defecto (más barato primero)
    }
    setPage(0);
  }

  function handleFilter(name: string | null) {
    setCreatorFilter(name);
    setPage(0);
  }

  const selectedModels = useMemo(
    () => selectedIds.map((id) => models.find((m) => m.id === id)).filter((m): m is AiModel => !!m),
    [selectedIds, models]
  );

  function scrollToComparator() {
    comparatorRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
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
    <div style={{ position: "relative" }}>
      {/* Filtro por proveedor */}
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 16 }}>
        {[null, ...creators].map((c) => {
          const active = creatorFilter === c;
          return (
            <button
              key={c ?? "all"}
              onClick={() => handleFilter(c)}
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

      <PaginationBar page={safePage} totalPages={totalPages} total={sortedFiltered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", marginTop: 10 }}>
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
                <tr
                  key={m.id}
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    background: selected ? "#2C40FF0d" : "transparent",
                    boxShadow: selected ? "inset 3px 0 0 0 var(--color-primary)" : "none",
                    transition: "background 150ms ease, box-shadow 150ms ease",
                  }}
                >
                  <td style={{ padding: "10px 12px", fontSize: 12.5, color: "#4B5563", fontVariantNumeric: "tabular-nums" }}>
                    {safePage * PAGE_SIZE + i + 1}
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

      <PaginationBar page={safePage} totalPages={totalPages} total={sortedFiltered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      {/* Comparación integrada — vive en la misma sección que el ranking */}
      <div ref={comparatorRef} style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--color-border)" }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-tertiary)", margin: "0 0 14px" }}>
          Comparar modelos seleccionados
        </p>
        <Comparator
          selected={selectedModels}
          allModels={models}
          onToggle={onToggleCompare}
          onSelectPreset={onSelectPreset}
        />
      </div>

      {/* Barra de selección flotante */}
      {selectedIds.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: "calc(100vw - 32px)",
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "8px 10px 8px 14px",
            boxShadow: "0 12px 32px -8px rgba(0,0,0,0.6)",
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--color-tertiary)", flexShrink: 0 }}>
            {selectedIds.length} de 4
          </span>
          <div className="flex items-center gap-1.5" style={{ overflowX: "auto", maxWidth: 360 }}>
            {selectedModels.map((m) => (
              <span
                key={m.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#fff",
                  background: "#2C40FF1f",
                  border: "1px solid #2C40FF44",
                  borderRadius: "var(--radius-md)",
                  padding: "3px 6px 3px 9px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {shortName(m.name)}
                <button
                  onClick={() => onToggleCompare(m.id)}
                  aria-label={`Quitar ${m.name} de la comparación`}
                  style={{ background: "transparent", border: "none", color: "var(--color-tertiary)", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 2 }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={scrollToComparator}
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "#fff",
              background: "var(--color-primary)",
              border: "1px solid var(--color-primary)",
              borderRadius: "var(--radius-md)",
              padding: "6px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Ver comparación ↓
          </button>
        </div>
      )}
    </div>
  );
}

function PaginationBar({
  page, totalPages, total, pageSize, onChange,
}: { page: number; totalPages: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  if (total === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  const btnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    minWidth: 28,
    height: 28,
    padding: "0 6px",
    fontSize: 12.5,
    fontWeight: 500,
    borderRadius: "var(--radius-md)",
    color: active ? "#fff" : disabled ? "#4B5563" : "var(--color-tertiary)",
    background: active ? "#2C40FF22" : "transparent",
    border: "1px solid " + (active ? "#2C40FF55" : "var(--color-border)"),
    cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <div className="flex items-center justify-between flex-wrap gap-3" style={{ padding: "4px 0" }}>
      <p style={{ fontSize: 12, color: "var(--color-tertiary)", margin: 0 }}>
        Mostrando {from}–{to} de {total} modelos
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onChange(page - 1)} disabled={page === 0} style={btnStyle(false, page === 0)}>‹</button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} style={{ fontSize: 12, color: "#4B5563", padding: "0 4px" }}>…</span>
            ) : (
              <button key={p} onClick={() => onChange(p)} style={btnStyle(p === page)}>{p + 1}</button>
            )
          )}
          <button onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1} style={btnStyle(false, page >= totalPages - 1)}>›</button>
        </div>
      )}
    </div>
  );
}
