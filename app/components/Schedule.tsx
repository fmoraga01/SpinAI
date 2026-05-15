"use client";

import { Assignment } from "@/lib/types";

interface Props {
  assignments: Assignment[];
  onRemove: (id: string) => void;
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

function isPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T12:00:00") < today;
}

export default function Schedule({ assignments, onRemove }: Props) {
  const sorted = [...assignments].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((a) => !isPast(a.date));
  const past = sorted.filter((a) => isPast(a.date)).reverse();

  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        <p>Sin turnos asignados</p>
        <p className="text-xs mt-1" style={{ color: "#4B5563" }}>
          Gira la ruleta para asignar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {upcoming.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
            Próximos viernes
          </p>
          <div className="space-y-2">
            {upcoming.map((a, i) => {
              const isNext = i === 0;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3"
                  style={{
                    background: isNext ? "#2C40FF0f" : "var(--color-surface-elevated)",
                    border: "1px solid " + (isNext ? "#2C40FF33" : "var(--color-border)"),
                    borderRadius: "var(--radius-md)",
                    padding: "10px 12px",
                  }}
                >
                  <span style={{ fontSize: 11, color: "#374151", fontWeight: 600, minWidth: 18, textAlign: "right" }}>
                    {i + 1}
                  </span>
                  <div
                    style={{
                      flexShrink: 0, width: 28, height: 28, borderRadius: "var(--radius-md)",
                      background: isNext ? "#2C40FF22" : "var(--color-surface)",
                      border: "1px solid " + (isNext ? "#2C40FF55" : "#1f2333"),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isNext ? "#2C40FF" : "#9CA3AF",
                      fontWeight: 600, fontSize: 10,
                    }}
                  >
                    {getInitials(a.memberName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {a.memberName}
                    </p>
                    <p className="text-xs capitalize" style={{ color: "#4B5563" }}>
                      {formatDate(a.date)}
                      {isNext && (
                        <span className="ml-2 font-medium" style={{ color: "var(--color-primary)" }}>
                          · Próximo
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(a.id)}
                    title="Eliminar"
                    style={{
                      color: "#374151", cursor: "pointer",
                      background: "transparent", border: "none", padding: "4px", fontSize: 12,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#F87171")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#374151")}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#374151" }}>
            Anteriores
          </p>
          <div className="space-y-2" style={{ opacity: 0.45 }}>
            {past.map((a, i) => (
              <div
                key={a.id}
                className="flex items-center gap-3"
                style={{
                  background: "var(--color-surface-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 12px",
                }}
              >
                <span style={{ fontSize: 11, color: "#374151", fontWeight: 600, minWidth: 18, textAlign: "right" }}>
                  {i + 1}
                </span>
                <div
                  style={{
                    flexShrink: 0, width: 28, height: 28, borderRadius: "var(--radius-md)",
                    background: "var(--color-surface)",
                    border: "1px solid #1f2333",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#9CA3AF", fontWeight: 600, fontSize: 10,
                  }}
                >
                  {getInitials(a.memberName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-secondary)" }}>
                    {a.memberName}
                  </p>
                  <p className="text-xs capitalize" style={{ color: "#374151" }}>
                    {formatDate(a.date)}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(a.id)}
                  title="Eliminar"
                  style={{
                    color: "#374151", cursor: "pointer",
                    background: "transparent", border: "none", padding: "4px", fontSize: 12,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#F87171")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#374151")}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
