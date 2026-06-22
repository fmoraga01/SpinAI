"use client";

import { useEffect, useRef, useState } from "react";
import { Template } from "@/lib/types";
import { THEMES } from "@/lib/themes";
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
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [crossed, setCrossed] = useState<Set<number>>(new Set());

  const th = THEMES[template.theme ?? "default"];

  function toggleCrossed(i: number) {
    setCrossed((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  useEffect(() => {
    let closed = false;

    function close() {
      if (closed) return;
      closed = true;
      document.exitFullscreen?.().catch(() => {});
      onCloseRef.current();
    }

    function onFullscreenChange() {
      if (!document.fullscreenElement) close();
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        close();
      }
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

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
        background: th.bg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <SlideBackground accent={th.accent} variant={th.animVariant} />

      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 40px",
          borderBottom: `1px solid ${th.cardBorder}`,
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
              background: th.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13, color: "#fff",
            }}
          >
            S
          </div>
          <span style={{ fontSize: 13, color: th.textSecondary, fontWeight: 500 }}>SpinAI · Presentación</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 12, color: th.textSecondary,
            background: th.cardBg,
            border: `1px solid ${th.cardBorder}`,
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
              border: `1px solid ${th.cardBorder}`,
              borderRadius: "var(--radius-md)",
              color: th.textSecondary,
              fontSize: 13, fontWeight: 500, cursor: "pointer",
              transition: "border-color 150ms, color 150ms",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = th.accent; e.currentTarget.style.color = th.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = th.cardBorder; e.currentTarget.style.color = th.textSecondary; }}
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
              fontSize: 14, color: th.accent, fontWeight: 700,
              marginBottom: 14, letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              {template.memberName}
            </p>
            <h1 style={{
              fontSize: "40px",
              fontWeight: 700, color: th.titleColor,
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
                background: th.cardBg,
                border: `1px solid ${th.cardBorder}`,
                borderRadius: "var(--radius-md)",
                padding: "28px 32px",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20,
                  fontSize: 13, fontWeight: 500, color: th.accent,
                  background: th.accentBg, border: `1px solid ${th.accentBorder}`,
                  borderRadius: "var(--radius-md)", padding: "4px 12px",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: th.accent, display: "inline-block", flexShrink: 0 }} />
                  Agenda
                </span>
                <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 18 }}>
                  {template.agenda.map((item, i) => {
                    const done = crossed.has(i);
                    return (
                      <li
                        key={i}
                        onClick={() => toggleCrossed(i)}
                        style={{ display: "flex", alignItems: "baseline", gap: 16, cursor: "pointer", transition: "opacity 200ms" }}
                      >
                        <span style={{
                          fontSize: "clamp(31px, 3.5vw, 43px)", fontWeight: 700,
                          minWidth: 48, flexShrink: 0, lineHeight: 1,
                          color: done ? th.cardBorder : th.accent,
                          transition: "color 200ms",
                        }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span style={{
                          fontSize: "clamp(18px, 2vw, 25px)",
                          lineHeight: 1.4, fontWeight: 500,
                          color: done ? th.textSecondary : th.textColor,
                          textDecoration: done ? "line-through" : "none",
                          transition: "color 200ms, text-decoration 200ms",
                        }}>
                          {item}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {hasKeyPoints && (
              <div style={{
                background: th.accentBg,
                border: `1px solid ${th.accentBorder}`,
                borderRadius: "var(--radius-md)",
                padding: "28px 32px",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20,
                  fontSize: 13, fontWeight: 500, color: th.accent,
                  background: th.accentBg, border: `1px solid ${th.accentBorder}`,
                  borderRadius: "var(--radius-md)", padding: "4px 12px",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: th.accent, display: "inline-block", flexShrink: 0 }} />
                  Puntos clave
                </span>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 18 }}>
                  {template.keyPoints.map((point, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                      <span style={{ color: th.accent, fontSize: 10, flexShrink: 0, paddingTop: 4 }}>◆</span>
                      <span style={{
                        fontSize: "clamp(18px, 2vw, 25px)",
                        color: th.textColor, lineHeight: 1.4, fontWeight: 500,
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
                background: th.cardBg,
                border: `1px solid ${th.cardBorder}`,
                borderRadius: "var(--radius-md)",
                padding: "28px 32px",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14,
                  fontSize: 13, fontWeight: 500, color: th.accent,
                  background: th.accentBg, border: `1px solid ${th.accentBorder}`,
                  borderRadius: "var(--radius-md)", padding: "4px 12px",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: th.accent, display: "inline-block", flexShrink: 0 }} />
                  Notas
                </span>
                <p style={{
                  fontSize: "clamp(14px, 1.4vw, 18px)",
                  color: th.textSecondary, lineHeight: 1.8,
                  margin: 0, whiteSpace: "pre-wrap",
                }}>
                  {template.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "relative", zIndex: 1,
        padding: "10px 40px",
        borderTop: `1px solid ${th.cardBorder}`,
        display: "flex", justifyContent: "center", flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: th.textSecondary }}>
          Presiona{" "}
          <kbd style={{
            background: th.cardBg,
            border: `1px solid ${th.cardBorder}`,
            borderRadius: 4, padding: "1px 6px", fontSize: 10,
          }}>ESC</kbd>{" "}
          para salir
        </span>
      </div>
    </div>
  );
}
