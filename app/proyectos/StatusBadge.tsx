import { ProjectStatus } from "@/lib/types";

const CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string; border: string }> = {
  desarrollo: { label: "Desarrollo", color: "#94A3B8", bg: "#94A3B815", border: "#94A3B833" },
  piloto: { label: "Piloto", color: "#2C40FF", bg: "#2C40FF15", border: "#2C40FF33" },
  produccion: { label: "Producción", color: "#22C55E", bg: "#22C55E15", border: "#22C55E33" },
};

// Reutilizado por ProjectForm.tsx (<select> de estado del proyecto) para
// no inventar un vocabulario distinto al que ya ve el usuario en el badge.
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  desarrollo: CONFIG.desarrollo.label,
  piloto: CONFIG.piloto.label,
  produccion: CONFIG.produccion.label,
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
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
