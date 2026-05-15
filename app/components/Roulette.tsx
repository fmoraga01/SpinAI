"use client";

import { useState, useRef, useEffect } from "react";
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
  const [preview, setPreview] = useState<BulkAssignmentPreview[] | null>(null);
  const [scrollPositions, setScrollPositions] = useState([0, 0, 0]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ITEM_HEIGHT = 80;

  function spin(buildPreview: () => BulkAssignmentPreview[]) {
    if (activeMembers.length === 0 || spinning) return;
    setSpinning(true);
    setPreview(null);

    const result = buildPreview();

    // Animate each reel stopping at the correct position
    setTimeout(() => {
      animateReel(0, result[0]?.memberName ?? "", () => {
        setTimeout(() => {
          animateReel(1, result[1]?.memberName ?? "", () => {
            setTimeout(() => {
              animateReel(2, result[2]?.memberName ?? "", () => {
                setPreview(result);
                setSpinning(false);
              });
            }, 300);
          });
        }, 300);
      });
    }, 100);
  }

  function animateReel(reelIndex: number, targetName: string, onComplete: () => void) {
    const targetIndex = activeMembers.findIndex((m) => m.name === targetName);
    if (targetIndex === -1) {
      onComplete();
      return;
    }

    const startPos = scrollPositions[reelIndex];
    const endPos = targetIndex * ITEM_HEIGHT;
    const distance = endPos - startPos;
    const duration = 1200 + reelIndex * 200;
    const startTime = Date.now();

    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Overshoot and settle for a satisfying effect
      const eased = easeOut(progress);
      const newPos = startPos + distance * eased;

      setScrollPositions((prev) => {
        const next = [...prev];
        next[reelIndex] = newPos;
        return next;
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setScrollPositions((prev) => {
          const next = [...prev];
          next[reelIndex] = endPos;
          return next;
        });
        onComplete();
      }
    }

    animate();
  }

  function handleConfirm() {
    if (!preview) return;
    onAssignAll(preview);
    setPreview(null);
    setScrollPositions([0, 0, 0]);
  }

  function handleCancel() {
    setPreview(null);
    setScrollPositions([0, 0, 0]);
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
          Máquina de Sorteo
        </h2>
      </div>
      <p className="text-xs mb-6 self-start" style={{ color: "#4B5563" }}>
        Gira los cilindros para asignar turnos
      </p>

      {/* Slot Machine */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          padding: "20px",
          background: "var(--color-surface-elevated)",
          border: "2px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)",
        }}
        ref={scrollRef}
      >
        {[0, 1, 2].map((reelIndex) => (
          <div
            key={reelIndex}
            style={{
              flex: 1,
              height: 280,
              overflow: "hidden",
              borderRadius: "var(--radius-md)",
              background: "rgba(44,64,255,0.05)",
              border: "1px solid var(--color-border)",
              position: "relative",
            }}
          >
            {/* Reel content */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                transform: `translateY(-${scrollPositions[reelIndex]}px)`,
                transition: spinning ? "none" : "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {[...activeMembers, ...activeMembers].map((member, i) => (
                <div
                  key={`${reelIndex}-${i}`}
                  style={{
                    height: ITEM_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <div className="text-center" style={{ width: "100%" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: getAvatarColor(member.name),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 11,
                        margin: "0 auto 6px",
                        boxShadow: `${getAvatarColor(member.name)}44 0px 0px 12px`,
                      }}
                    >
                      {getInitials(member.name)}
                    </div>
                    <p className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                      {member.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Glass effect overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(8,9,15,0.5) 0%, transparent 30%, transparent 70%, rgba(8,9,15,0.5) 100%)",
                pointerEvents: "none",
              }}
            />

            {/* Center indicator */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
                borderTop: "2px solid var(--color-primary)",
                borderBottom: "2px solid var(--color-primary)",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                boxShadow: "inset 0 0 12px rgba(44,64,255,0.2)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Preview */}
      {preview && (
        <div className="w-full mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
            Asignaciones generadas
          </p>
          <div className="space-y-2">
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
                    animation: `fadeIn 300ms ease ${i * 80}ms both`,
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
                      padding: "2px 6px",
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
          {spinning ? "Sorteando..." : "¡Girar cilindros!"}
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
