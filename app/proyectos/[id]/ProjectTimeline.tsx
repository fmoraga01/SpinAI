"use client";

import { useMemo } from "react";
import { WeeklyUpdate } from "@/lib/types";
import HealthBadge from "../HealthBadge";

function weekLabel(weekOf: string): string {
  return new Date(weekOf + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

interface Group {
  key: string;
  update: WeeklyUpdate;
}

export default function ProjectTimeline({ updates }: { updates: WeeklyUpdate[] }) {
  const groups = useMemo<Group[]>(() => {
    return [...updates]
      .sort((a, b) => b.weekOf.localeCompare(a.weekOf))
      .map((update) => ({ key: update.id, update }));
  }, [updates]);

  if (groups.length === 0) {
    return (
      <div
        style={{
          background: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          textAlign: "center",
          padding: "32px 18px",
        }}
      >
        <p style={{ fontSize: 13, color: "var(--color-tertiary)", margin: 0 }}>
          Este proyecto todavía no tiene avances semanales registrados.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <style>{`
        .proyecto-timeline-row {
          transition: border-color 150ms ease-out, transform 150ms ease-out, background 150ms ease-out;
        }
        .proyecto-timeline-row:hover {
          border-color: rgba(91,108,255,0.4);
          background: var(--color-surface-elevated-hover, var(--color-surface-elevated));
          transform: translateX(2px);
        }
      `}</style>
      {groups.map((group, gi) => (
        <div key={group.key} style={{ display: "flex", gap: 20 }}>
          {/* Riel de tiempo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 12 }}>
            <div
              style={{
                width: 10, height: 10, borderRadius: "50%", marginTop: 6,
                background: "#5B6CFF22", border: "1px solid #5B6CFF66", flexShrink: 0,
              }}
            />
            {gi < groups.length - 1 && (
              <div style={{ width: 1, flex: 1, background: "var(--color-border)", margin: "6px 0" }} />
            )}
          </div>

          {/* Contenido de la semana */}
          <div style={{ flex: 1, minWidth: 0, paddingBottom: gi < groups.length - 1 ? 20 : 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-tertiary)", textTransform: "capitalize", margin: "0 0 8px" }}>
              Semana del {weekLabel(group.update.weekOf)}
            </p>
            <div
              className="proyecto-timeline-row"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
              }}
            >
              <HealthBadge status={group.update.status} />
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: "19px" }}>
                {group.update.note}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
