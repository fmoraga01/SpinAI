"use client";

import { useState, useEffect, useRef } from "react";
import { TeamMember } from "@/lib/types";

interface Props {
  members: TeamMember[];
  nextFriday: string;
  alreadyAssigned: boolean;
  onAssign: (memberId: string, date: string) => void;
}

function formatFriday(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Roulette({ members, nextFriday, alreadyAssigned, onAssign }: Props) {
  const activeMembers = members.filter((m) => m.active);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<TeamMember | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [selectedDate, setSelectedDate] = useState(nextFriday);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSelectedDate(nextFriday);
  }, [nextFriday]);

  function spin() {
    if (activeMembers.length === 0 || spinning) return;
    setSpinning(true);
    setWinner(null);

    let elapsed = 0;
    const duration = 3000;
    let currentInterval = 80;

    function tick() {
      const random = activeMembers[Math.floor(Math.random() * activeMembers.length)];
      setDisplayName(random.name);
      elapsed += currentInterval;

      if (elapsed > duration * 0.6) {
        currentInterval = Math.min(currentInterval * 1.15, 400);
      }

      if (elapsed >= duration) {
        const finalWinner = activeMembers[Math.floor(Math.random() * activeMembers.length)];
        setDisplayName(finalWinner.name);
        setWinner(finalWinner);
        setSpinning(false);
      } else {
        intervalRef.current = setTimeout(tick, currentInterval);
      }
    }

    intervalRef.current = setTimeout(tick, currentInterval);
  }

  function handleConfirm() {
    if (!winner) return;
    onAssign(winner.id, selectedDate);
    setWinner(null);
    setDisplayName("");
  }

  function handleCancel() {
    setWinner(null);
    setDisplayName("");
  }

  const isDisabled = spinning || activeMembers.length < 1 || alreadyAssigned;

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
        <h2
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Ruleta de Turno
        </h2>
      </div>
      <p className="text-xs mb-6 self-start" style={{ color: "#4B5563" }}>
        Selecciona el viernes y gira para asignar
      </p>

      {/* Date selector */}
      <div className="w-full mb-6">
        <label
          className="text-xs font-medium block mb-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Viernes a asignar
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setWinner(null);
            setDisplayName("");
          }}
          className="w-full text-sm outline-none"
          style={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "8px 12px",
            color: "var(--color-text-primary)",
            colorScheme: "dark",
          }}
        />
      </div>

      {/* Roulette circle */}
      <div
        className="flex items-center justify-center mb-6"
        style={{
          width: 180,
          height: 180,
          borderRadius: "50%",
          border: "2px solid " + (spinning ? "var(--color-primary)" : winner ? "#10B981" : "var(--color-border)"),
          background: spinning
            ? "#2C40FF11"
            : winner
            ? "#10B98111"
            : "var(--color-surface-elevated)",
          boxShadow: spinning
            ? "var(--shadow-glow)"
            : winner
            ? "rgba(16, 185, 129, 0.3) 0px 0px 20px 0px"
            : "none",
          transition: "all 300ms ease",
        }}
      >
        <div className="text-center px-4">
          {displayName ? (
            <p
              className="text-base font-semibold leading-tight"
              style={{ color: winner ? "#10B981" : "var(--color-primary)" }}
            >
              {displayName}
            </p>
          ) : (
            <p className="text-sm" style={{ color: "#4B5563" }}>
              {activeMembers.length === 0 ? "Sin activos" : "Presiona Girar"}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {!winner ? (
        <button
          onClick={spin}
          disabled={isDisabled}
          className="w-full text-sm font-semibold transition-all duration-150"
          style={{
            background: isDisabled ? "var(--color-surface-elevated)" : "var(--color-primary)",
            color: isDisabled ? "#4B5563" : "var(--color-text-primary)",
            border: "1px solid " + (isDisabled ? "var(--color-border)" : "var(--color-primary)"),
            borderRadius: "var(--radius-md)",
            padding: "12px",
            cursor: isDisabled ? "not-allowed" : "pointer",
            boxShadow: isDisabled ? "none" : "var(--shadow-glow-sm)",
          }}
        >
          {spinning ? "Girando..." : alreadyAssigned ? "Ya asignado" : "¡Girar!"}
        </button>
      ) : (
        <div className="w-full space-y-3">
          <p
            className="text-xs text-center"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <strong style={{ color: "#10B981" }}>{winner.name}</strong> liderará el{" "}
            <strong>{formatFriday(selectedDate)}</strong>
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 text-sm font-medium transition-all duration-150"
              style={{
                background: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "8px",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 text-sm font-semibold transition-all duration-150"
              style={{
                background: "#10B981",
                color: "#fff",
                border: "1px solid #10B981",
                borderRadius: "var(--radius-md)",
                padding: "8px",
                cursor: "pointer",
                boxShadow: "rgba(16, 185, 129, 0.3) 0px 0px 10px 0px",
              }}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {alreadyAssigned && !winner && (
        <p className="mt-3 text-xs text-center" style={{ color: "#F59E0B" }}>
          Este viernes ya tiene turno. Cambia la fecha o elimina la asignación.
        </p>
      )}

      {activeMembers.length === 0 && (
        <p className="mt-3 text-xs text-center" style={{ color: "#F87171" }}>
          Activa al menos un integrante para girar.
        </p>
      )}
    </div>
  );
}
