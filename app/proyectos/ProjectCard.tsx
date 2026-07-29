"use client";

import { Project } from "@/lib/types";
import StatusBadge from "./StatusBadge";

function latestUpdateDate(project: Project): string | null {
  if (project.updates.length === 0) return null;
  return [...project.updates].sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0].weekOf;
}

export default function ProjectCard({ project, onSelect }: { project: Project; onSelect: (id: string) => void }) {
  const status = project.status;
  const lastUpdate = latestUpdateDate(project);

  return (
    <button
      type="button"
      onClick={() => onSelect(project.id)}
      style={{ all: "unset", display: "block", width: "100%", cursor: "pointer" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 18,
          background: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          transition: "border-color 150ms ease",
          height: "100%",
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2C40FF44"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", margin: 0, lineHeight: "22px" }}>
            {project.name}
          </h3>
          <StatusBadge status={status} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--color-tertiary)" }}>{project.country}</span>
          <span style={{ fontSize: 12, color: "var(--color-tertiary)" }}>·</span>
          <span style={{ fontSize: 12, color: "var(--color-tertiary)" }}>{project.businessUnit}</span>
        </div>
        <p style={{ fontSize: 11.5, color: "#4B5563", margin: 0 }}>
          {lastUpdate
            ? `Última actualización: ${new Date(lastUpdate + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}`
            : "Sin actualizaciones registradas"}
        </p>
      </div>
    </button>
  );
}
