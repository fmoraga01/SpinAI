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

const AVATAR_COLORS = [
  "#2C40FF",
  "#7C3AED",
  "#0891B2",
  "#059669",
  "#DC2626",
  "#D97706",
  "#DB2777",
  "#65A30D",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export default function Schedule({ assignments, onRemove }: Props) {
  const sorted = [...assignments].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((a) => !isPast(a.date));
  const past = sorted.filter((a) => isPast(a.date));

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-glow)",
        padding: "24px",
      }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-5">
        <span style={{ color: "var(--color-primary)", fontSize: 18 }}>▤</span>
        <h2
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Historial de Turnos
        </h2>
      </div>

      {assignments.length === 0 ? (
        <div
          className="text-center py-8 text-sm"
          style={{
            color: "var(--color-text-secondary)",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <p className="mt-4">Sin turnos asignados</p>
          <p className="text-xs mt-1" style={{ color: "#4B5563" }}>
            Gira la ruleta para asignar
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "#4B5563" }}
              >
                Próximos viernes
              </p>
              <ul className="space-y-2">
                {upcoming.map((a, i) => {
                  const color = getAvatarColor(a.memberName);
                  const isNext = i === 0;
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between transition-all duration-150"
                      style={{
                        background: isNext ? "#2C40FF11" : "var(--color-surface-elevated)",
                        border: "1px solid " + (isNext ? "#2C40FF44" : "var(--color-border)"),
                        borderRadius: "var(--radius-md)",
                        padding: "10px 12px",
                        boxShadow: isNext ? "var(--shadow-glow-sm)" : "none",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: color,
                            boxShadow: `${color}44 0px 0px 8px 0px`,
                            fontSize: 11,
                          }}
                        >
                          {getInitials(a.memberName)}
                        </div>
                        <div>
                          <p
                            className="text-sm font-semibold leading-tight"
                            style={{ color: isNext ? "var(--color-primary)" : "var(--color-text-primary)" }}
                          >
                            {a.memberName}
                          </p>
                          <p className="text-xs" style={{ color: "#4B5563" }}>
                            {formatDate(a.date)}
                            {isNext && (
                              <span
                                className="ml-2 font-medium"
                                style={{ color: "var(--color-primary)" }}
                              >
                                · Próximo
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemove(a.id)}
                        title="Eliminar"
                        className="text-xs transition-colors duration-150"
                        style={{
                          color: "#374151",
                          cursor: "pointer",
                          background: "transparent",
                          border: "none",
                          padding: "4px",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#F87171")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#374151")}
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "#374151" }}
              >
                Anteriores
              </p>
              <ul className="space-y-2" style={{ opacity: 0.5 }}>
                {past
                  .slice()
                  .reverse()
                  .map((a) => {
                    const color = getAvatarColor(a.memberName);
                    return (
                      <li
                        key={a.id}
                        className="flex items-center justify-between"
                        style={{
                          background: "var(--color-surface-elevated)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          padding: "10px 12px",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex-shrink-0 flex items-center justify-center text-white font-bold"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: color,
                              fontSize: 11,
                            }}
                          >
                            {getInitials(a.memberName)}
                          </div>
                          <div>
                            <p
                              className="text-sm font-medium"
                              style={{ color: "var(--color-text-secondary)" }}
                            >
                              {a.memberName}
                            </p>
                            <p className="text-xs" style={{ color: "#374151" }}>
                              {formatDate(a.date)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => onRemove(a.id)}
                          title="Eliminar"
                          style={{
                            color: "#374151",
                            cursor: "pointer",
                            background: "transparent",
                            border: "none",
                            fontSize: 12,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#F87171")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#374151")}
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
