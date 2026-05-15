"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = CENTER - 12;
const INNER_RADIUS = RADIUS * 0.28;

// Two alternating dark tones from the design system
const SEG_EVEN = "#141724"; // surface-elevated
const SEG_ODD  = "#0e101a"; // surface

function drawWheel(
  ctx: CanvasRenderingContext2D,
  members: TeamMember[],
  angle: number,
  glowIndex: number | null
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, SIZE * dpr, SIZE * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  const n = members.length;

  if (n === 0) {
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = SEG_ODD;
    ctx.fill();
    ctx.strokeStyle = "#1f2333";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#374151";
    ctx.font = "500 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin integrantes", CENTER, CENTER);
    ctx.restore();
    return;
  }

  const segAngle = (Math.PI * 2) / n;

  for (let i = 0; i < n; i++) {
    const startAngle = angle + i * segAngle;
    const endAngle = startAngle + segAngle;
    const isWinner = glowIndex === i;

    // Segment fill
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.arc(CENTER, CENTER, RADIUS, startAngle, endAngle);
    ctx.closePath();

    if (isWinner) {
      // Winner: primary blue fill
      ctx.fillStyle = "#2C40FF22";
      ctx.shadowColor = "#2C40FF";
      ctx.shadowBlur = 20;
    } else {
      ctx.fillStyle = i % 2 === 0 ? SEG_EVEN : SEG_ODD;
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Divider line
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.arc(CENTER, CENTER, RADIUS, startAngle, endAngle);
    ctx.closePath();
    ctx.strokeStyle = isWinner ? "#2C40FF55" : "#08090f";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label — initials
    const midAngle = startAngle + segAngle / 2;
    const labelR = INNER_RADIUS + (RADIUS - INNER_RADIUS) * 0.58;
    const lx = CENTER + Math.cos(midAngle) * labelR;
    const ly = CENTER + Math.sin(midAngle) * labelR;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(midAngle + Math.PI / 2);
    const fontSize = n > 10 ? 9 : n > 6 ? 11 : 12;
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = isWinner ? "#2C40FF" : "#9CA3AF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(getInitials(members[i].name), 0, 0);
    ctx.restore();
  }

  // Outer ring
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = glowIndex !== null ? "#2C40FF" : "#1f2333";
  ctx.lineWidth = glowIndex !== null ? 1.5 : 1.5;
  if (glowIndex !== null) {
    ctx.shadowColor = "#2C40FF";
    ctx.shadowBlur = 12;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Hub
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, INNER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = "#08090f";
  ctx.fill();
  ctx.strokeStyle = glowIndex !== null ? "#2C40FF44" : "#1f2333";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Hub dot
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 4, 0, Math.PI * 2);
  ctx.fillStyle = glowIndex !== null ? "#2C40FF" : "#374151";
  if (glowIndex !== null) {
    ctx.shadowColor = "#2C40FF";
    ctx.shadowBlur = 8;
  }
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawPointer(ctx: CanvasRenderingContext2D) {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.scale(dpr, dpr);

  const px = CENTER;
  const py = 4;
  const pw = 8;
  const ph = 16;

  ctx.beginPath();
  ctx.moveTo(px, py + ph);
  ctx.lineTo(px - pw / 2, py);
  ctx.lineTo(px + pw / 2, py);
  ctx.closePath();
  ctx.fillStyle = "#2C40FF";
  ctx.shadowColor = "#2C40FF";
  ctx.shadowBlur = 8;
  ctx.fill();

  ctx.restore();
}

export default function Roulette({ members, onAssignAll }: Props) {
  const activeMembers = members.filter((m) => m.active);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const angleRef = useRef(0);

  const [spinning, setSpinning] = useState(false);
  const [preview, setPreview] = useState<BulkAssignmentPreview[] | null>(null);
  const [glowIndex, setGlowIndex] = useState<number | null>(null);
  const [winnerName, setWinnerName] = useState<string | null>(null);

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const redraw = useCallback((angle: number, glow: number | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    drawWheel(ctx, activeMembers, angle, glow);
  }, [activeMembers]);

  useEffect(() => {
    redraw(angleRef.current, glowIndex);
  }, [activeMembers, redraw, glowIndex]);

  useEffect(() => {
    const pointer = pointerCanvasRef.current;
    if (!pointer) return;
    const ctx = pointer.getContext("2d")!;
    drawPointer(ctx);
  }, []);

  function spin() {
    if (activeMembers.length === 0 || spinning) return;
    setSpinning(true);
    setPreview(null);
    setGlowIndex(null);
    setWinnerName(null);

    const result = buildBulkAssignmentPreview();
    const winnerName = result[0]?.memberName ?? "";
    const winnerIndex = activeMembers.findIndex((m) => m.name === winnerName);

    const n = activeMembers.length;
    const segAngle = (Math.PI * 2) / n;

    // Target angle so winner segment lands under the pointer (top = -π/2)
    const winnerMidAngle = winnerIndex * segAngle + segAngle / 2;
    const targetOffset = -Math.PI / 2 - winnerMidAngle;
    const fullSpins = (5 + Math.floor(Math.random() * 4)) * Math.PI * 2;
    const targetAngle = targetOffset + fullSpins;

    const startAngle = angleRef.current;
    const totalDelta = targetAngle - startAngle;
    const duration = 3500;
    const startTime = performance.now();

    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 4);
    }

    function frame(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOut(t);
      const currentAngle = startAngle + totalDelta * eased;

      angleRef.current = currentAngle;
      redraw(currentAngle, null);

      if (t < 1) {
        animRef.current = requestAnimationFrame(frame);
      } else {
        angleRef.current = targetAngle;
        setGlowIndex(winnerIndex);
        setWinnerName(winnerName);
        setPreview(result);
        setSpinning(false);
      }
    }

    animRef.current = requestAnimationFrame(frame);
  }

  function handleConfirm() {
    if (!preview) return;
    onAssignAll(preview);
    setPreview(null);
    setGlowIndex(null);
    setWinnerName(null);
  }

  function handleCancel() {
    setPreview(null);
    setGlowIndex(null);
    setWinnerName(null);
  }

  const isDisabled = spinning || activeMembers.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Wheel */}
      <div className="relative mb-6" style={{ width: SIZE, height: SIZE }}>
        <canvas
          ref={canvasRef}
          width={SIZE * dpr}
          height={SIZE * dpr}
          style={{ width: SIZE, height: SIZE, display: "block" }}
        />
        <canvas
          ref={pointerCanvasRef}
          width={SIZE * dpr}
          height={SIZE * dpr}
          style={{ width: SIZE, height: SIZE, position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        />
      </div>

      {/* Winner badge */}
      {winnerName && !spinning && (
        <div
          className="w-full mb-4 text-center py-3 px-4"
          style={{
            background: "#2C40FF11",
            border: "1px solid #2C40FF33",
            borderRadius: "var(--radius-md)",
            animation: "fadeIn 400ms ease both",
          }}
        >
          <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
          <p className="text-xs mb-1" style={{ color: "#4B5563" }}>Primer turno</p>
          <p className="text-base font-semibold" style={{ color: "var(--color-primary)" }}>{winnerName}</p>
        </div>
      )}

      {/* Preview list */}
      {preview && (
        <div className="w-full mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
            Asignaciones completas
          </p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {preview.map((p, i) => {
              return (
                <div
                  key={p.memberId}
                  className="flex items-center gap-3"
                  style={{
                    background: i === 0 ? "#2C40FF0f" : "var(--color-surface-elevated)",
                    border: "1px solid " + (i === 0 ? "#2C40FF33" : "var(--color-border)"),
                    borderRadius: "var(--radius-md)",
                    padding: "10px 12px",
                    animation: `fadeIn 300ms ease ${i * 60}ms both`,
                  }}
                >
                  <span style={{ fontSize: 11, color: "#374151", fontWeight: 600, minWidth: 18, textAlign: "right" }}>
                    {i + 1}
                  </span>
                  <div
                    style={{
                      flexShrink: 0, width: 28, height: 28, borderRadius: "var(--radius-md)",
                      background: i === 0 ? "#2C40FF22" : "var(--color-surface)",
                      border: "1px solid " + (i === 0 ? "#2C40FF55" : "#1f2333"),
                      display: "flex", alignItems: "center",
                      justifyContent: "center", color: i === 0 ? "#2C40FF" : "#9CA3AF",
                      fontWeight: 600, fontSize: 10,
                    }}
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Buttons */}
      {!preview ? (
        <button
          onClick={spin}
          disabled={isDisabled}
          className="w-full text-sm font-semibold transition-all duration-150"
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
          {spinning ? "Sorteando..." : "¡Girar!"}
        </button>
      ) : (
        <div className="flex gap-2 w-full">
          <button
            onClick={handleCancel}
            className="flex-1 text-sm font-medium"
            style={{
              background: "transparent", color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)",
              padding: "10px", cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 text-sm font-semibold"
            style={{
              background: "var(--color-primary)", color: "#fff",
              border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)",
              padding: "10px", cursor: "pointer", boxShadow: "var(--shadow-glow-sm)",
            }}
          >
            Confirmar {preview.length} turnos
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
