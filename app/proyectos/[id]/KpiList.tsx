import { ProjectKpi } from "@/lib/types";

const tileStyle: React.CSSProperties = {
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "16px 18px",
};

export default function KpiList({ kpis }: { kpis: ProjectKpi[] }) {
  if (kpis.length === 0) {
    return (
      <div style={{ ...tileStyle, textAlign: "center", padding: "24px 18px" }}>
        <p style={{ fontSize: 13, color: "var(--color-tertiary)", margin: 0 }}>
          Este proyecto todavía no tiene KPIs registrados.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {kpis.map((kpi) => (
        <div key={kpi.label} style={tileStyle}>
          <p style={{ fontSize: 12, color: "var(--color-tertiary)", margin: "0 0 6px", lineHeight: "16px" }}>
            {kpi.label}
          </p>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  );
}
