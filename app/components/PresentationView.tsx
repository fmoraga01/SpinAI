"use client";

import { useEffect } from "react";
import { Template } from "@/lib/types";
import SlideBackground from "./SlideBackground";

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
    function onFullscreenChange() {
      if (!document.fullscreenElement) onClose();
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        document.exitFullscreen?.().catch(() => {});
        onClose();
      }
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    // capture:true intercepts Escape before the Drawer's listener
    window.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  const hasAgenda = template.agenda.length > 0;
  const hasKeyPoints = template.keyPoints.length > 0;
  const hasNotes = !!template.notes.trim();

  const hasBoth = hasAgenda && hasKeyPoints;

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
      <SlideBackground />
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 40px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 26, height: 26,
              borderRadius: "var(--radius-md)",
              background: "var(--color-primary)",
              boxShadow: "var(--shadow-glow-sm)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13, color: "#fff",
            }}
          >
            S
          </div>
          <span style={{ fontSize: 13, color: "#4B5563", fontWeight: 500 }}>SpinAI · Presentación</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 12, color: "#4B5563",
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "4px 12px", textTransform: "capitalize",
          }}>
            {formatDate(date)}
          </span>
          <button
            onClick={() => { document.exitFullscreen?.().catch(() => {}); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 16px",
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
            ✕ Salir
          </button>
        </div>
      </div>

      {/* Slide */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 80px",
          overflow: "auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ width: "50%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>
        {/* Presenter + title */}
        <div>
          <p style={{
            fontSize: 14, color: "var(--color-primary)", fontWeight: 700,
            marginBottom: 14, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            {template.memberName}
          </p>
          <h1 style={{
            fontSize: "40px",
            fontWeight: 700, color: "#fff",
            lineHeight: 1.1, letterSpacing: "-0.02em", margin: 0,
          }}>
            {template.title || "Sin título"}
          </h1>
        </div>

        {/* Sections */}
        <div style={{
          display: "grid",
          gridTemplateColumns: hasBoth ? "1fr 1fr" : "1fr",
          gap: 24,
          alignItems: "start",
        }}>
          {hasAgenda && (
            <div style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "28px 32px",
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20,
                fontSize: 13, fontWeight: 500, color: "var(--color-primary)",
                background: "#2C40FF15", border: "1px solid #2C40FF33",
                borderRadius: "var(--radius-md)", padding: "4px 12px",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", boxShadow: "var(--shadow-glow-sm)", display: "inline-block", flexShrink: 0 }} />
                Agenda
              </span>
              <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 18 }}>
                {template.agenda.map((item, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                    <span style={{
                      fontSize: "clamp(31px, 3.5vw, 43px)", color: "var(--color-primary)", fontWeight: 700,
                      minWidth: 48, flexShrink: 0, lineHeight: 1,
                    }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{
                      fontSize: "clamp(18px, 2vw, 25px)",
                      color: "var(--color-text-primary)", lineHeight: 1.4, fontWeight: 500,
                    }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {hasKeyPoints && (
            <div style={{
              background: "#2C40FF0a",
              border: "1px solid #2C40FF22",
              borderRadius: "var(--radius-md)",
              padding: "28px 32px",
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20,
                fontSize: 13, fontWeight: 500, color: "var(--color-primary)",
                background: "#2C40FF15", border: "1px solid #2C40FF33",
                borderRadius: "var(--radius-md)", padding: "4px 12px",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", boxShadow: "var(--shadow-glow-sm)", display: "inline-block", flexShrink: 0 }} />
                Puntos clave
              </span>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 18 }}>
                {template.keyPoints.map((point, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                    <span style={{ color: "var(--color-primary)", fontSize: 10, flexShrink: 0, paddingTop: 4 }}>◆</span>
                    <span style={{
                      fontSize: "clamp(18px, 2vw, 25px)",
                      color: "var(--color-text-primary)", lineHeight: 1.4, fontWeight: 500,
                    }}>
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasNotes && (
            <div style={{
              gridColumn: hasBoth ? "1 / -1" : "auto",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "28px 32px",
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14,
                fontSize: 13, fontWeight: 500, color: "var(--color-primary)",
                background: "#2C40FF15", border: "1px solid #2C40FF33",
                borderRadius: "var(--radius-md)", padding: "4px 12px",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", boxShadow: "var(--shadow-glow-sm)", display: "inline-block", flexShrink: 0 }} />
                Notas
              </span>
              <p style={{
                fontSize: "clamp(14px, 1.4vw, 18px)",
                color: "var(--color-text-secondary)", lineHeight: 1.8,
                margin: 0, whiteSpace: "pre-wrap",
              }}>
                {template.notes}
              </p>
            </div>
          )}
        </div>
        </div>{/* end 70% wrapper */}
      </div>

      {/* Footer */}
      <div style={{
        position: "relative", zIndex: 1,
        padding: "10px 40px",
        borderTop: "1px solid var(--color-border)",
        display: "flex", justifyContent: "center", flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: "#374151" }}>
          Presiona{" "}
          <kbd style={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: 4, padding: "1px 6px", fontSize: 10,
          }}>ESC</kbd>{" "}
          para salir
        </span>
      </div>
    </div>
  );
}
