import { HealthStatus } from "@/lib/types";

const CONFIG: Record<HealthStatus, { label: string; color: string; bg: string; border: string }> = {
  on_track: { label: "En curso", color: "#22C55E", bg: "#22C55E15", border: "#22C55E33" },
  at_risk: { label: "En riesgo", color: "#F59E0B", bg: "#F59E0B15", border: "#F59E0B33" },
  delayed: { label: "Atrasado", color: "#EF4444", bg: "#EF444415", border: "#EF444433" },
};

export default function HealthBadge({ status }: { status: HealthStatus | null }) {
  if (status === null) {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--color-tertiary)",
          background: "var(--color-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "2px 9px",
          whiteSpace: "nowrap",
        }}
      >
        Sin datos
      </span>
    );
  }

  const { label, color, bg, border } = CONFIG[status];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-md)",
        padding: "2px 9px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
