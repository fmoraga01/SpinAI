"use client";

import { useEffect, useRef, useState } from "react";
import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";
import { Project } from "@/lib/types";
import StatusBadge from "./StatusBadge";

function latestUpdateDate(project: Project): string | null {
  if (project.updates.length === 0) return null;
  return [...project.updates].sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0].weekOf;
}

function menuItemStyle(danger: boolean, isLast: boolean): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 12px",
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer",
    background: "transparent",
    color: danger ? "#F87171" : "var(--color-text-primary)",
    border: "none",
    borderBottom: isLast ? "none" : "1px solid var(--color-border)",
    transition: "background 150ms ease",
  };
}

// Mismo patrón que StatusSelect (ProjectForm.tsx): botón + lista de opciones
// propia posicionada absolute, con click-outside para cerrar.
function CardMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        aria-label="Más opciones"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        style={{
          width: 24,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: open ? "var(--color-border)" : "transparent",
          border: "none",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          transition: "background 150ms ease",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "var(--color-border)"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <EllipsisVerticalIcon style={{ width: 16, height: 16 }} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 20,
            minWidth: 130,
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(); }}
            style={{ ...menuItemStyle(false, false), transition: "color 150ms" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-primary)"; }}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onDelete(); }}
            style={menuItemStyle(true, true)}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F8717122"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

interface Props {
  project: Project;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (project: Project) => void;
}

export default function ProjectCard({ project, onSelect, onEdit, onDelete }: Props) {
  const status = project.status;
  const lastUpdate = latestUpdateDate(project);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(project.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(project.id);
        }
      }}
      style={{ display: "block", width: "100%", cursor: "pointer" }}
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
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              margin: 0,
              lineHeight: "22px",
              minWidth: 0,
              flex: 1,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {project.name}
          </h3>
          <StatusBadge status={status} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--color-tertiary)" }}>{project.country}</span>
          <span style={{ fontSize: 12, color: "var(--color-tertiary)" }}>·</span>
          <span style={{ fontSize: 12, color: "var(--color-tertiary)" }}>{project.businessUnit}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto" }}>
          <p style={{ fontSize: 11.5, color: "#4B5563", margin: 0 }}>
            {lastUpdate
              ? `Última actualización: ${new Date(lastUpdate + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}`
              : "Sin actualizaciones registradas"}
          </p>
          <CardMenu onEdit={() => onEdit(project.id)} onDelete={() => onDelete(project)} />
        </div>
      </div>
    </div>
  );
}
