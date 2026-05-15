"use client";

import { useEffect } from "react";
import { Template } from "@/lib/types";

interface Props {
  template: Template;
  date: string;
  onClose: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function PresentationView({ template, date, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasAgenda = template.agenda.length > 0;
  const hasKeyPoints = template.keyPoints.length > 0;
  const hasNotes = !!template.notes.trim();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 28, height: 28,
              borderRadius: "var(--radius-md)",
              background: "var(--color-primary)",
              boxShadow: "var(--shadow-glow-sm)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 14, color: "#fff",
            }}
          >
            S
          </div>
          <span style={{ fontSize: 13, color: "#4B5563", fontWeight: 500 }}>
            SpinAI · Presentación
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span
            style={{
              fontSize: 12, color: "#4B5563",
              background: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "4px 10px",
              textTransform: "capitalize",
            }}
          >
            {formatDate(date)}
          </span>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px",
              background: "transparent",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-secondary)",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
              transition: "border-color 150ms, color 150ms",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.color = "var(--color-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          >
            ✕ <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 48px",
          overflow: "auto",
        }}
      >
        <div style={{ width: "100%", maxWidth: 900 }}>

          {/* Presenter + title */}
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 13, color: "var(--color-primary)", fontWeight: 600, marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {template.memberName}
            </p>
            <h1
              style={{
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {template.title || "Sin título"}
            </h1>
          </div>

          {/* Grid sections */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: hasAgenda && hasKeyPoints ? "1fr 1fr" : "1fr",
              gap: 20,
            }}
          >
            {hasAgenda && (
              <div
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "24px",
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
                  Agenda
                </p>
                <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {template.agenda.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span style={{ fontSize: 11, color: "var(--color-primary)", fontWeight: 700, minWidth: 20, paddingTop: 2 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontSize: 15, color: "var(--color-text-primary)", lineHeight: 1.4 }}>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {hasKeyPoints && (
              <div
                style={{
                  background: "#2C40FF0a",
                  border: "1px solid #2C40FF22",
                  borderRadius: "var(--radius-md)",
                  padding: "24px",
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
                  Puntos clave
                </p>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {template.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span style={{ color: "var(--color-primary)", fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>◆</span>
                      <span style={{ fontSize: 15, color: "var(--color-text-primary)", lineHeight: 1.4 }}>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasNotes && (
              <div
                style={{
                  gridColumn: hasAgenda && hasKeyPoints ? "1 / -1" : "auto",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "24px",
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                  Notas
                </p>
                <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
                  {template.notes}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: "12px 32px",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, color: "#374151" }}>Presiona <kbd style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 4, padding: "1px 6px", fontSize: 10 }}>ESC</kbd> para salir de la presentación</span>
      </div>
    </div>
  );
}
