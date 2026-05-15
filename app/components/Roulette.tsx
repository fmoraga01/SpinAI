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
  const [displayColor, setDisplayColor] = useState("");
  const [preview, setPreview] = useState<BulkAssignmentPreview[] | null>(null);
  const [rotation, setRotation] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  function spin(buildPreview: () => BulkAssignmentPreview[]) {
    if (activeMembers.length === 0 || spinning) return;
    setSpinning(true);
    setPreview(null);
    setRotation(0);

    let elapsed = 0;
    const duration = 2800;
    let currentInterval = 70;
    let spinRotation = 0;

    function tick() {
      const random = activeMembers[Math.floor(Math.random() * activeMembers.length)];
      setDisplayName(random.name);
      setDisplayColor(getAvatarColor(random.name));

      // Rotate circle continuously
      spinRotation += Math.random() * 45;
      setRotation(spinRotation % 360);

      elapsed += currentInterval;

      if (elapsed > duration * 0.55) {
        currentInterval = Math.min(currentInterval * 1.18, 380);
      }

      if (elapsed >= duration) {
        const result = buildPreview();
        setDisplayName(result[0]?.memberName ?? "");
        setDisplayColor(getAvatarColor(result[0]?.memberName ?? ""));
        setPreview(result);
        setSpinning(false);
        setRotation(0);
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
    setDisplayColor("");
  }

  function handleCancel() {
    setPreview(null);
    setDisplayName("");
    setDisplayColor("");
  }

  const isDisabled = spinning || activeMembers.length === 0;

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-glow)",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-2 self-start">
        <span style={{ color: "var(--color-primary)", fontSize: 18 }}>◎</span>
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
          Ruleta de Turno
        </h2>
      </div>
      <p className="text-xs mb-6 self-start" style={{ color: "#4B5563" }}>
        Asigna a todos los integrantes automáticamente
      </p>

      {/* Spinning Circle */}
      {!preview && (
        <div className="mb-8 relative" style={{ perspective: "1000px" }}>
          <style>{`
            @keyframes spinCustom {
              from { transform: rotateZ(0deg); }
              to { transform: rotateZ(360deg); }
            }
          `}</style>

          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: "50%",
              border: "3px solid " + (spinning ? "var(--color-primary)" : "var(--color-border)"),
              background: spinning ? "#2C40FF0f" : "var(--color-surface-elevated)",
              boxShadow: spinning ? "var(--shadow-glow), inset 0 0 30px rgba(44,64,255,0.1)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "border-color 300ms ease, box-shadow 300ms ease",
              transform: spinning ? `rotateZ(${rotation}deg)` : "rotateZ(0deg)",
              transformOrigin: "center",
            }}
          >
            <div className="text-center">
              {displayName ? (
                <>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: displayColor,
                      boxShadow: `${displayColor}66 0px 0px 20px`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 18,
                      margin: "0 auto 8px",
                    }}
                  >
                    {getInitials(displayName)}
                  </div>
                  <p
                    className="text-sm font-semibold leading-tight"
                    style={{ color: "var(--color-text-primary)", maxWidth: 150 }}
                  >
                    {displayName}
                  </p>
                </>
              ) : (
                <div>
                  <p style={{ fontSize: 28, marginBottom: 4, color: "var(--color-primary)" }}>◎</p>
                  <p className="text-xs" style={{ color: "#4B5563" }}>
                    {activeMembers.length === 0 ? "Sin activos" : `${activeMembers.length} integrantes`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Spin indicator arrow */}
          {!spinning && !preview && (
            <div
              style={{
                position: "absolute",
                top: -12,
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "10px solid var(--color-primary)",
              }}
            />
          )}
        </div>
      )}

      {/* Preview list */}
      {preview && (
        <div className="w-full mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
            Asignaciones generadas
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {preview.map((p, i) => {
              const color = getAvatarColor(p.memberName);
              return (
                <div
                  key={p.memberId}
                  className="flex items-center gap-3"
                  style={{
                    background: i === 0 ? "#2C40FF0f" : "var(--color-surface-elevated)",
                    border: "1px solid " + (i === 0 ? "#2C40FF33" : "var(--color-border)"),
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    animation: `fadeIn 300ms ease ${i * 50}ms both`,
                  }}
                >
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                  `}</style>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#4B5563",
                      fontWeight: 600,
                      minWidth: 24,
                      textAlign: "center",
                      background: "#2C40FF22",
                      padding: "2px 4px",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    {i + 1}
                  </div>

                  <div
                    style={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 12,
                      boxShadow: `${color}44 0px 0px 12px`,
                    }}
                  >
                    {getInitials(p.memberName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {p.memberName}
                    </p>
                    <p className="text-xs capitalize" style={{ color: "#4B5563" }}>
                      {formatDate(p.date)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Buttons */}
      {!preview ? (
        <button
          onClick={() => spin(buildBulkAssignmentPreview)}
          disabled={isDisabled}
          className="w-full text-sm font-semibold transition-all duration-200"
          style={{
            background: isDisabled ? "var(--color-surface-elevated)" : "var(--color-primary)",
            color: isDisabled ? "#4B5563" : "#fff",
            border: "1px solid " + (isDisabled ? "var(--color-border)" : "var(--color-primary)"),
            borderRadius: "var(--radius-md)",
            padding: "12px",
            cursor: isDisabled ? "not-allowed" : "pointer",
            boxShadow: isDisabled ? "none" : "var(--shadow-glow-sm)",
          }}
        >
          {spinning ? "Sorteando..." : "¡Girar y asignar todos!"}
        </button>
      ) : (
        <div className="flex gap-2 w-full">
          <button
            onClick={handleCancel}
            className="flex-1 text-sm font-medium transition-colors duration-150"
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
            className="flex-1 text-sm font-semibold transition-all duration-150"
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
            Confirmar
          </button>
        </div>
      )}

      {activeMembers.length === 0 && (
        <p className="mt-4 text-xs text-center" style={{ color: "#F87171" }}>
          Agrega integrantes en la sección Equipo para comenzar.
        </p>
      )}
    </div>
  );
}
