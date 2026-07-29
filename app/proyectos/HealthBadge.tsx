import { HealthStatus } from "@/lib/types";

const CONFIG: Record<HealthStatus, { label: string; color: string; bg: string; border: string }> = {
  on_track: { label: "En curso", color: "#22C55E", bg: "#22C55E15", border: "#22C55E33" },
  at_risk: { label: "En riesgo", color: "#F59E0B", bg: "#F59E0B15", border: "#F59E0B33" },
  delayed: { label: "Atrasado", color: "#EF4444", bg: "#EF444415", border: "#EF444433" },
};

// Reutilizado por ProjectForm.tsx (<select> de estado del proyecto) para
// no inventar un vocabulario distinto al que ya ve el usuario en el badge.
export const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  on_track: CONFIG.on_track.label,
  at_risk: CONFIG.at_risk.label,
  delayed: CONFIG.delayed.label,
};

export default function HealthBadge({ status }: { status: HealthStatus }) {
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
