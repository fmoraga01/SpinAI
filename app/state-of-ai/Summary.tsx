import { ExecutiveSummary, formatIndex } from "@/lib/stateOfAi";

export default function Summary({ summary }: { summary: ExecutiveSummary }) {
  const { thisWeekReleases, last30Count, prev30Count, growthPct, leader, mostActiveLab } = summary;

  return (
    <div
      style={{
        background: "var(--color-surface-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "24px 28px",
        borderLeft: "3px solid var(--color-primary)",
      }}
    >
      <p style={{ fontSize: 15, lineHeight: "26px", color: "var(--color-text-secondary)", margin: 0 }}>
        {thisWeekReleases.length > 0 ? (
          <>
            En los últimos 7 días se {thisWeekReleases.length === 1 ? "sumó" : "sumaron"}{" "}
            <strong style={{ color: "#fff" }}>
              {thisWeekReleases.length} {thisWeekReleases.length === 1 ? "modelo nuevo" : "modelos nuevos"}
            </strong>{" "}
            al ecosistema
            {thisWeekReleases[0] ? <> — el más reciente, <strong style={{ color: "#fff" }}>{thisWeekReleases[0].name}</strong> de {thisWeekReleases[0].creatorName}</> : ""}.{" "}
          </>
        ) : (
          "En los últimos 7 días no se registraron lanzamientos nuevos entre los modelos evaluados. "
        )}
        {growthPct !== null ? (
          <>
            En los últimos 30 días se lanzaron{" "}
            <strong style={{ color: "#fff" }}>{last30Count} modelos</strong>, un{" "}
            <strong style={{ color: growthPct >= 0 ? "#5B6CFF" : "#F0A868" }}>
              {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(0)}%
            </strong>{" "}
            frente a los {prev30Count} del mes anterior.{" "}
          </>
        ) : (
          <>En los últimos 30 días se lanzaron <strong style={{ color: "#fff" }}>{last30Count} modelos</strong>. </>
        )}
        {mostActiveLab && (
          <>
            <strong style={{ color: "#fff" }}>{mostActiveLab.name}</strong> es el laboratorio más activo del último
            mes, con {mostActiveLab.count} {mostActiveLab.count === 1 ? "lanzamiento" : "lanzamientos"}.{" "}
          </>
        )}
        Hoy, <strong style={{ color: "#fff" }}>{leader.name}</strong> ({leader.creatorName}) lidera el índice de
        inteligencia con <strong style={{ color: "#fff" }}>{formatIndex(leader.intelligenceIndex)}</strong> puntos.
      </p>
    </div>
  );
}
