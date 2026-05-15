"use client";

import { useState, useRef } from "react";
import { TeamMember } from "@/lib/types";
import { BulkAssignmentPreview, buildBulkAssignmentPreview } from "@/lib/storage";

interface Props {
  members: TeamMember[];
  onAssignAll: (previews: BulkAssignmentPreview[]) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = ["#2C40FF","#7C3AED","#0891B2","#059669","#DC2626","#D97706","#DB2777","#65A30D"];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export default function Roulette({ members, onAssignAll }: Props) {
  const activeMembers = members.filter((m) => m.active);
  const [spinning, setSpinning] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [preview, setPreview] = useState<BulkAssignmentPreview[] | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  function spin(buildPreview: () => BulkAssignmentPreview[]) {
    if (activeMembers.length === 0 || spinning) return;
    setSpinning(true);
    setPreview(null);

    let elapsed = 0;
    const duration = 2800;
    let currentInterval = 70;

    function tick() {
      const random = activeMembers[Math.floor(Math.random() * activeMembers.length)];
      setDisplayName(random.name);
      elapsed += currentInterval;

      if (elapsed > duration * 0.55) {
        currentInterval = Math.min(currentInterval * 1.18, 380);
      }

      if (elapsed >= duration) {
        const result = buildPreview();
        setDisplayName(result[0]?.memberName ?? "");
        setPreview(result);
        setSpinning(false);
      } else {
        intervalRef.current = setTimeout(tick, currentInterval);
      }
    }

    intervalRef.current = setTimeout(tick, currentInterval);
  }

  function handleConfirm() {
    if (!preview) return;
    onAssignAll(preview);
    setPreview(null);
    setDisplayName("");
  }

  function handleCancel() {
    setPreview(null);
    setDisplayName("");
  }

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-glow)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-1 self-start">
        <span style={{ color: "var(--color-primary)", fontSize: 18 }}>◎</span>
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
          Ruleta de Turno
        </h2>
      </div>
      <p className="text-xs mb-6 self-start" style={{ color: "#4B5563" }}>
        Asigna un viernes a cada integrante activo automáticamente
      </p>

      {/* Circle */}
      {!preview && (
        <div
          className="flex items-center justify-center mb-6"
          style={{
            width: 180,
            height: 180,
            borderRadius: "50%",
            border: "2px solid " + (spinning ? "var(--color-primary)" : "var(--color-border)"),
            background: spinning ? "#2C40FF11" : "var(--color-surface-elevated)",
            boxShadow: spinning ? "var(--shadow-glow)" : "none",
            transition: "all 300ms ease",
          }}
        >
          <div className="text-center px-4">
            {displayName ? (
              <p className="text-base font-semibold leading-tight" style={{ color: "var(--color-primary)" }}>
                {displayName}
              </p>
            ) : (
              <div className="text-center">
                <p className="text-2xl mb-1">◎</p>
                <p className="text-xs" style={{ color: "#4B5563" }}>
                  {activeMembers.length === 0 ? "Sin activos" : `${activeMembers.length} integrantes`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview list */}
      {preview && (
        <div className="w-full mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
            Asignaciones generadas
          </p>
          <ul className="space-y-2 mb-4">
            {preview.map((p, i) => {
              const color = getAvatarColor(p.memberName);
              return (
                <li
                  key={p.memberId}
                  className="flex items-center gap-3"
                  style={{
                    background: i === 0 ? "#2C40FF0d" : "var(--color-surface-elevated)",
                    border: "1px solid " + (i === 0 ? "#2C40FF33" : "var(--color-border)"),
                    borderRadius: "var(--radius-md)",
                    padding: "10px 12px",
                  }}
                >
                  <span style={{ fontSize: 11, color: "#4B5563", width: 16, textAlign: "right", flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <div
                    className="flex-shrink-0 flex items-center justify-center text-white font-bold"
                    style={{ width: 28, height: 28, borderRadius: "50%", background: color, fontSize: 10 }}
                  >
                    {getInitials(p.memberName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {p.memberName}
                    </p>
                    <p className="text-xs capitalize" style={{ color: "#4B5563" }}>
                      {formatDate(p.date)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Buttons */}
      {!preview ? (
        <button
          onClick={() => spin(buildBulkAssignmentPreview)}
          disabled={spinning || activeMembers.length === 0}
          className="w-full text-sm font-semibold transition-all duration-150"
          style={{
            background: activeMembers.length === 0 ? "var(--color-surface-elevated)" : "var(--color-primary)",
            color: activeMembers.length === 0 ? "#4B5563" : "#fff",
            border: "1px solid " + (activeMembers.length === 0 ? "var(--color-border)" : "var(--color-primary)"),
            borderRadius: "var(--radius-md)",
            padding: "12px",
            cursor: activeMembers.length === 0 || spinning ? "not-allowed" : "pointer",
            boxShadow: activeMembers.length > 0 && !spinning ? "var(--shadow-glow-sm)" : "none",
          }}
        >
          {spinning ? "Sorteando..." : "¡Girar y asignar todos!"}
        </button>
      ) : (
        <div className="flex gap-2 w-full">
          <button
            onClick={handleCancel}
            className="flex-1 text-sm font-medium"
            style={{
              background: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "10px",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 text-sm font-semibold"
            style={{
              background: "var(--color-primary)",
              color: "#fff",
              border: "1px solid var(--color-primary)",
              borderRadius: "var(--radius-md)",
              padding: "10px",
              cursor: "pointer",
              boxShadow: "var(--shadow-glow-sm)",
            }}
          >
            Confirmar {preview.length} asignaciones
          </button>
        </div>
      )}

      {activeMembers.length === 0 && (
        <p className="mt-3 text-xs text-center" style={{ color: "#F87171" }}>
          Agrega y activa integrantes en la sección Equipo.
        </p>
      )}
    </div>
  );
}
