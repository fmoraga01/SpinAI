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
    const startInterval = 80;
    let currentInterval = startInterval;

    function tick() {
      const random = activeMembers[Math.floor(Math.random() * activeMembers.length)];
      setDisplayName(random.name);
      elapsed += currentInterval;

      // Slow down near the end
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
      <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <span className="text-2xl">🎯</span> Ruleta de Turno
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Selecciona el viernes y gira para asignar el turno
      </p>

      {/* Date selector */}
      <div className="w-full mb-6">
        <label className="text-xs font-medium text-gray-500 mb-1 block">Viernes a asignar</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setWinner(null);
            setDisplayName("");
          }}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Roulette display */}
      <div
        className={`w-48 h-48 rounded-full flex items-center justify-center mb-6 border-4 transition-all duration-300 ${
          spinning
            ? "border-indigo-400 bg-indigo-50 animate-pulse"
            : winner
            ? "border-emerald-400 bg-emerald-50"
            : "border-gray-200 bg-gray-50"
        }`}
      >
        <div className="text-center px-4">
          {displayName ? (
            <p
              className={`text-lg font-bold leading-tight ${
                winner ? "text-emerald-700" : "text-indigo-700"
              }`}
            >
              {displayName}
            </p>
          ) : (
            <p className="text-gray-400 text-sm">
              {activeMembers.length === 0
                ? "Sin integrantes activos"
                : "Presiona Girar"}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {!winner ? (
        <button
          onClick={spin}
          disabled={spinning || activeMembers.length < 1 || alreadyAssigned}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-base hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md"
        >
          {spinning ? "Girando..." : alreadyAssigned ? "Ya asignado" : "¡Girar!"}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-sm text-gray-600 text-center">
            <strong>{winner.name}</strong> liderará la reunión del{" "}
            <strong>{formatFriday(selectedDate)}</strong>
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={handleCancel}
              className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {alreadyAssigned && !winner && (
        <p className="mt-3 text-xs text-amber-600 text-center">
          Este viernes ya tiene un turno asignado. Cambia la fecha o elimina la asignación.
        </p>
      )}

      {activeMembers.length === 0 && (
        <p className="mt-3 text-xs text-red-500 text-center">
          Activa al menos un integrante para girar la ruleta.
        </p>
      )}
    </div>
  );
}
