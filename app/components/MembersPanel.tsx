"use client";

import { useState } from "react";
import { TeamMember } from "@/lib/types";

interface Props {
  members: TeamMember[];
  onAdd: (name: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function MembersPanel({ members, onAdd, onToggle, onRemove }: Props) {
  const [name, setName] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
  }

  function handleRemove(id: string) {
    if (confirmRemove === id) {
      onRemove(id);
      setConfirmRemove(null);
    } else {
      setConfirmRemove(id);
      setTimeout(() => setConfirmRemove(null), 3000);
    }
  }

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "none",
        padding: "24px",
      }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-5">
        <span style={{ color: "var(--color-primary)", fontSize: 18 }}>⬡</span>
        <h2
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Equipo
        </h2>
      </div>

      {/* Input */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del integrante..."
          className="flex-1 text-sm outline-none placeholder:text-[#4B5563]"
          style={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "8px 12px",
            color: "var(--color-text-primary)",
            transition: "border-color 150ms ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#2C40FF")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="text-sm font-medium transition-all duration-150"
          style={{
            background: name.trim() ? "var(--color-primary)" : "#1a2035",
            color: "var(--color-text-primary)",
            border: "1px solid " + (name.trim() ? "var(--color-primary)" : "var(--color-border)"),
            borderRadius: "var(--radius-md)",
            padding: "8px 16px",
            cursor: name.trim() ? "pointer" : "not-allowed",
            boxShadow: name.trim() ? "var(--shadow-glow-sm)" : "none",
          }}
        >
          Agregar
        </button>
      </form>

      {/* List */}
      {members.length === 0 ? (
        <div
          className="text-center py-8 text-sm"
          style={{ color: "var(--color-text-secondary)", borderTop: "1px solid var(--color-border)" }}
        >
          <p className="mt-4">Sin integrantes aún</p>
          <p className="text-xs mt-1" style={{ color: "#4B5563" }}>Agrega el primero arriba</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between transition-all duration-150"
              style={{
                background: m.active ? "#2C40FF11" : "var(--color-surface-elevated)",
                border: "1px solid " + (m.active ? "#2C40FF44" : "var(--color-border)"),
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onToggle(m.id)}
                  title={m.active ? "Desactivar" : "Activar"}
                  className="flex-shrink-0 transition-all duration-150"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "2px solid " + (m.active ? "var(--color-primary)" : "var(--color-border)"),
                    background: m.active ? "var(--color-primary)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: m.active ? "var(--shadow-glow-sm)" : "none",
                    cursor: "pointer",
                  }}
                >
                  {m.active && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span
                  className="text-sm font-medium"
                  style={{
                    color: m.active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    opacity: m.active ? 1 : 0.5,
                  }}
                >
                  {m.name}
                </span>
              </div>

              <button
                onClick={() => handleRemove(m.id)}
                className="text-xs transition-all duration-150"
                style={{
                  color: confirmRemove === m.id ? "#F87171" : "#4B5563",
                  background: confirmRemove === m.id ? "#F8717122" : "transparent",
                  border: "1px solid " + (confirmRemove === m.id ? "#F87171" : "transparent"),
                  borderRadius: "var(--radius-md)",
                  padding: "2px 8px",
                  cursor: "pointer",
                  fontWeight: confirmRemove === m.id ? 600 : 400,
                }}
              >
                {confirmRemove === m.id ? "¿Seguro?" : "✕"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Footer */}
      <div
        className="mt-4 flex items-center justify-between text-xs"
        style={{
          color: "#4B5563",
          borderTop: "1px solid var(--color-border)",
          paddingTop: "12px",
        }}
      >
        <span>{members.filter((m) => m.active).length} activos</span>
        <span>{members.length} total</span>
      </div>
    </div>
  );
}
