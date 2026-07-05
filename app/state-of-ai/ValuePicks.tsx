import { AiModel, formatIndex, formatPrice } from "@/lib/stateOfAi";

const MARK = "#5B6CFF";
const MIN_CAPABILITY = 0.75; // % del índice del líder para contar como "capaz"
const MAX_PICKS = 6;

interface Pick {
  model: AiModel;
  pctOfLeader: number;
  priceRatio: number;
}

function buildPicks(models: AiModel[], leader: AiModel): Pick[] {
  const threshold = leader.intelligenceIndex! * MIN_CAPABILITY;
  return models
    .filter(
      (m) =>
        m.id !== leader.id &&
        m.intelligenceIndex !== null &&
        m.intelligenceIndex! >= threshold &&
        m.priceBlended1m !== null &&
        m.priceBlended1m! > 0 &&
        m.priceBlended1m! < leader.priceBlended1m!
    )
    .sort((a, b) => a.priceBlended1m! - b.priceBlended1m!)
    .slice(0, MAX_PICKS)
    .map((m) => ({
      model: m,
      pctOfLeader: (m.intelligenceIndex! / leader.intelligenceIndex!) * 100,
      priceRatio: leader.priceBlended1m! / m.priceBlended1m!,
    }));
}

export default function ValuePicks({ models, leader }: { models: AiModel[]; leader: AiModel }) {
  const picks = buildPicks(models, leader);

  if (picks.length === 0) return null;

  return (
    <div>
      <p style={{ fontSize: 12.5, color: "var(--color-tertiary)", margin: "0 0 18px" }}>
        <strong style={{ color: "#F0A868" }}>Comparado contra el líder actual</strong> — <strong style={{ color: "var(--color-text-secondary)" }}>{leader.name}</strong>:{" "}
        índice {formatIndex(leader.intelligenceIndex)} a {formatPrice(leader.priceBlended1m)}/1M tokens.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {picks.map((p) => (
          <div
            key={p.model.id}
            style={{
              background: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "18px 20px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                fontSize: 11,
                fontWeight: 600,
                color: MARK,
                background: "#2C40FF15",
                border: "1px solid #2C40FF33",
                borderRadius: "var(--radius-md)",
                padding: "2px 8px",
                marginBottom: 10,
              }}
            >
              {p.priceRatio.toFixed(1)}× más barato
            </span>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: "0 0 2px" }}>{p.model.name}</p>
            <p style={{ fontSize: 12, color: "var(--color-tertiary)", margin: "0 0 14px" }}>{p.model.creatorName}</p>

            <p style={{ fontSize: 13, lineHeight: "20px", color: "var(--color-text-secondary)", margin: "0 0 14px" }}>
              Índice <strong style={{ color: "#fff" }}>{formatIndex(p.model.intelligenceIndex)}</strong> (
              {p.pctOfLeader.toFixed(0)}% del líder) por{" "}
              <strong style={{ color: "#fff" }}>{formatPrice(p.model.priceBlended1m)}/1M tokens</strong>.
            </p>

            {/* Comparación de precio, en dólares reales — sin score abstracto */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 46, fontSize: 10.5, color: "#4B5563", flexShrink: 0 }}>Líder</span>
                <div style={{ flex: 1, height: 6, borderRadius: 4, background: "var(--color-border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: "var(--color-border-bright)", width: "100%" }} />
                </div>
                <span style={{ fontSize: 10.5, color: "#4B5563", fontVariantNumeric: "tabular-nums", flexShrink: 0, width: 44, textAlign: "right" }}>
                  {formatPrice(leader.priceBlended1m)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 46, fontSize: 10.5, color: "var(--color-tertiary)", flexShrink: 0 }}>Este</span>
                <div style={{ flex: 1, height: 6, borderRadius: 4, background: "var(--color-border)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 4,
                      background: MARK,
                      width: `${Math.max(4, (p.model.priceBlended1m! / leader.priceBlended1m!) * 100)}%`,
                    }}
                  />
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: MARK, fontVariantNumeric: "tabular-nums", flexShrink: 0, width: 44, textAlign: "right" }}>
                  {formatPrice(p.model.priceBlended1m)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
