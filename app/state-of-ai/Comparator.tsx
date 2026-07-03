"use client";

import { AiModel } from "@/lib/stateOfAi";

const MARK = "#5B6CFF";

interface MetricRow {
  label: string;
  unit: string;
  value: (m: AiModel) => number | null;
  format: (v: number) => string;
  lowerIsBetter: boolean;
}

const METRICS: MetricRow[] = [
  { label: "Inteligencia", unit: "índice 0–100", value: (m) => m.intelligenceIndex, format: (v) => v.toFixed(1), lowerIsBetter: false },
  { label: "Programación", unit: "índice 0–100", value: (m) => m.codingIndex, format: (v) => v.toFixed(1), lowerIsBetter: false },
  { label: "Matemáticas", unit: "índice 0–100", value: (m) => m.mathIndex, format: (v) => v.toFixed(1), lowerIsBetter: false },
  { label: "Precio input", unit: "USD / 1M tokens", value: (m) => m.priceInput1m, format: (v) => `$${v.toFixed(2)}`, lowerIsBetter: true },
  { label: "Precio output", unit: "USD / 1M tokens", value: (m) => m.priceOutput1m, format: (v) => `$${v.toFixed(2)}`, lowerIsBetter: true },
  { label: "Velocidad", unit: "tokens / segundo", value: (m) => m.tokensPerSecond, format: (v) => `${Math.round(v)}`, lowerIsBetter: false },
  { label: "Latencia", unit: "segundos al primer token", value: (m) => m.ttftSeconds, format: (v) => `${v.toFixed(1)}s`, lowerIsBetter: true },
];

interface ComparatorProps {
  selected: AiModel[];
  allModels: AiModel[];
  onToggle: (id: string) => void;
  onSelectPreset: (ids: string[]) => void;
}

export default function Comparator({ selected, allModels, onToggle, onSelectPreset }: ComparatorProps) {
  const presets = buildPresets(allModels);

  if (selected.length === 0) {
    return (
      <div
        style={{
          border: "1px dashed var(--color-border-bright)",
          borderRadius: "var(--radius-md)",
          padding: "36px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-secondary)", margin: "0 0 6px" }}>
          Elige modelos desde el ranking para compararlos
        </p>
        <p style={{ fontSize: 13, color: "#4B5563", margin: "0 0 18px" }}>
          Usa el botón «+» de cada fila (hasta 4 modelos), o parte de una comparación sugerida:
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => onSelectPreset(p.ids)}
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                padding: "7px 14px",
                borderRadius: "var(--radius-md)",
                color: "var(--color-primary)",
                background: "#2C40FF12",
                border: "1px solid #2C40FF44",
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 200 + selected.length * 160 }}>
        <thead>
          <tr style={{ background: "var(--color-surface-elevated)", borderBottom: "1px solid var(--color-border)" }}>
            <th style={{ width: 190, padding: "12px 14px" }} />
            {selected.map((m) => (
              <th key={m.id} style={{ padding: "12px 14px", textAlign: "left", verticalAlign: "top" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", margin: 0 }}>{m.name}</p>
                    <p style={{ fontSize: 11.5, fontWeight: 500, color: "var(--color-tertiary)", margin: "2px 0 0" }}>{m.creatorName}</p>
                  </div>
                  <button
                    onClick={() => onToggle(m.id)}
                    aria-label={`Quitar ${m.name} de la comparación`}
                    style={{
                      fontSize: 12,
                      lineHeight: 1,
                      color: "var(--color-tertiary)",
                      background: "transparent",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      width: 22,
                      height: 22,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRICS.map((metric) => {
            const values = selected.map((m) => metric.value(m));
            const usable = values.filter((v): v is number => v !== null);
            if (usable.length === 0) return null;
            const best = metric.lowerIsBetter ? Math.min(...usable) : Math.max(...usable);
            const barMax = Math.max(...usable);

            return (
              <tr key={metric.label} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", margin: 0 }}>{metric.label}</p>
                  <p style={{ fontSize: 11, color: "#4B5563", margin: "1px 0 0" }}>{metric.unit}</p>
                </td>
                {selected.map((m, i) => {
                  const v = values[i];
                  const isBest = v !== null && v === best && usable.length > 1;
                  return (
                    <td key={m.id} style={{ padding: "12px 14px", verticalAlign: "top" }}>
                      {v === null ? (
                        <span style={{ fontSize: 13, color: "#4B5563" }}>—</span>
                      ) : (
                        <div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: isBest ? MARK : "#fff", fontVariantNumeric: "tabular-nums" }}>
                              {metric.format(v)}
                            </span>
                            {isBest && (
                              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: MARK }}>
                                Mejor
                              </span>
                            )}
                          </div>
                          <div style={{ width: "100%", maxWidth: 130, height: 4, borderRadius: 4, background: "var(--color-border)", overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                borderRadius: 4,
                                background: MARK,
                                opacity: isBest ? 1 : 0.45,
                                width: `${(v / barMax) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildPresets(models: AiModel[]): { label: string; ids: string[] }[] {
  const withIntelligence = models.filter((m) => m.intelligenceIndex !== null);
  const frontier3 = withIntelligence.slice(0, 3).map((m) => m.id);

  const leader = withIntelligence[0]?.intelligenceIndex ?? 0;
  const value3 = withIntelligence
    .filter((m) => m.priceBlended1m !== null && m.intelligenceIndex! >= leader * 0.8)
    .sort((a, b) => a.priceBlended1m! - b.priceBlended1m!)
    .slice(0, 3)
    .map((m) => m.id);

  const presets = [];
  if (frontier3.length === 3) presets.push({ label: "Los 3 más inteligentes", ids: frontier3 });
  if (value3.length === 3) presets.push({ label: "Mejor relación precio/calidad", ids: value3 });
  return presets;
}
