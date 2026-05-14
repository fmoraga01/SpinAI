"use client";

import { Assignment } from "@/lib/types";

interface Props {
  assignments: Assignment[];
  onRemove: (id: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T12:00:00") < today;
}

const COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-teal-500",
];

function getColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % COLORS.length;
  return COLORS[hash];
}

export default function Schedule({ assignments, onRemove }: Props) {
  const sorted = [...assignments].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((a) => !isPast(a.date));
  const past = sorted.filter((a) => isPast(a.date));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-2xl">📅</span> Historial de turnos
      </h2>

      {assignments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Aún no hay turnos asignados. ¡Gira la ruleta!
        </p>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Próximos viernes
              </h3>
              <ul className="space-y-2">
                {upcoming.map((a, i) => (
                  <li
                    key={a.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      i === 0
                        ? "border-indigo-200 bg-indigo-50"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getColor(a.memberName)}`}
                      >
                        {getInitials(a.memberName)}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${i === 0 ? "text-indigo-800" : "text-gray-800"}`}>
                          {a.memberName}
                        </p>
                        <p className={`text-xs ${i === 0 ? "text-indigo-600" : "text-gray-500"}`}>
                          {formatDate(a.date)}
                          {i === 0 && " · Próximo"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(a.id)}
                      title="Eliminar asignación"
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Anteriores
              </h3>
              <ul className="space-y-2 opacity-60">
                {past
                  .slice()
                  .reverse()
                  .map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getColor(a.memberName)}`}
                        >
                          {getInitials(a.memberName)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">{a.memberName}</p>
                          <p className="text-xs text-gray-400">{formatDate(a.date)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemove(a.id)}
                        title="Eliminar"
                        className="text-gray-200 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
