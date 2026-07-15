"use client";

import { useEffect, useRef, useState } from "react";
import { Template } from "@/lib/types";
import { THEMES } from "@/lib/themes";
import { FONTS } from "@/lib/fonts";
import { SIZES, scaleSize } from "@/lib/sizes";
import SlideBackground from "./SlideBackground";
import MeetingTimeline from "./MeetingTimeline";

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
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const [crossed, setCrossed] = useState<Set<number>>(new Set());

  const timing = template.timing?.enabled ? template.timing : null;
  const [meetingRunning, setMeetingRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemStartElapsedSec, setItemStartElapsedSec] = useState(0);
  const startRef = useRef<number | null>(null);
  const baseElapsedRef = useRef(0);

  const allAgendaCrossed = timing !== null && template.agenda.length > 0 && template.agenda.every((_, idx) => crossed.has(idx));
  // Reunión completa (todos los ítems tachados): el cronómetro deja de correr,
  // igual que "Pausar", sin necesidad de tocar el estado meetingRunning.
  const isRunning = meetingRunning && !allAgendaCrossed;

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      const extra = startRef.current !== null ? (Date.now() - startRef.current) / 1000 : 0;
      setElapsedSec(baseElapsedRef.current + extra);
    }, 500);
    return () => clearInterval(id);
  }, [isRunning]);

  function startMeeting() {
    startRef.current = Date.now();
    setMeetingRunning(true);
  }
  function pauseMeeting() {
    if (startRef.current !== null) baseElapsedRef.current += (Date.now() - startRef.current) / 1000;
    startRef.current = null;
    setMeetingRunning(false);
  }
  function resetMeeting() {
    startRef.current = null;
    baseElapsedRef.current = 0;
    setMeetingRunning(false);
    setElapsedSec(0);
    setCurrentIndex(0);
    setItemStartElapsedSec(0);
    setCrossed(new Set());
  }
  const meetingStarted = meetingRunning || elapsedSec > 0;

  const th = THEMES[template.theme ?? "default"];
  const fnt = FONTS[template.font ?? "sans"];
  const szCfg = SIZES[template.size ?? "md"];
  const ts = szCfg.titleScale;
  const ns = szCfg.numberScale;
  const bs = szCfg.bodyScale;

  function toggleCrossed(i: number) {
    const willBeCrossed = !crossed.has(i);
    setCrossed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
    // Tachar el ítem que está actualmente en curso en la línea de tiempo
    // avanza el timer al siguiente; destachar o tachar otro ítem no lo mueve.
    // Si con esto quedan todos tachados, el efecto de arriba detiene el cronómetro.
    if (timing && willBeCrossed && i === currentIndex && currentIndex < timing.items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setItemStartElapsedSec(elapsedSec);
    }
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
              fontWeight: 700, fontSize: 13, color: th.badgeText,
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
          {timing && !meetingStarted && (
            <button
              onClick={startMeeting}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 16px",
                background: th.accent, color: th.badgeText,
                border: `1px solid ${th.accent}`,
                borderRadius: "var(--radius-md)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              ▶ Iniciar reunión
            </button>
          )}
          {timing && meetingStarted && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {allAgendaCrossed ? (
                <span style={{ fontSize: 12, color: th.textSecondary, fontWeight: 500 }}>✓ Reunión finalizada</span>
              ) : (
                <button
                  onClick={isRunning ? pauseMeeting : startMeeting}
                  style={{
                    padding: "6px 14px",
                    background: "transparent", color: th.textSecondary,
                    border: `1px solid ${th.cardBorder}`,
                    borderRadius: "var(--radius-md)",
                    fontSize: 12, fontWeight: 500, cursor: "pointer",
                  }}
                >
                  {isRunning ? "⏸ Pausar" : "▶ Reanudar"}
                </button>
              )}
              <button
                onClick={resetMeeting}
                title="Reiniciar cronómetro"
                style={{
                  width: 28, height: 28,
                  background: "transparent", color: th.textSecondary,
                  border: `1px solid ${th.cardBorder}`,
                  borderRadius: "var(--radius-md)",
                  fontSize: 13, cursor: "pointer",
                }}
              >
                ↻
              </button>
            </div>
          )}
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
              fontSize: scaleSize(fnt.titleSize ?? "40px", ts),
              fontFamily: fnt.titleFamily,
              fontWeight: fnt.titleWeight,
              color: fnt.syntaxTitle ?? th.titleColor,
              lineHeight: 1.1,
              letterSpacing: fnt.titleTracking,
              margin: 0,
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
                          fontSize: scaleSize(fnt.numberSize ?? "clamp(31px, 3.5vw, 43px)", ns),
                          fontFamily: fnt.titleFamily,
                          fontWeight: fnt.titleWeight,
                          minWidth: 48, flexShrink: 0, lineHeight: 1,
                          color: done ? th.cardBorder : (fnt.syntaxNumber ?? th.accent),
                          transition: "color 200ms",
                        }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span style={{
                          fontSize: scaleSize(fnt.bodySize ?? "clamp(18px, 2vw, 25px)", bs),
                          fontFamily: fnt.bodyFamily,
                          lineHeight: 1.4, fontWeight: fnt.bodyWeight,
                          color: done ? th.textSecondary : (fnt.syntaxPalette ? fnt.syntaxPalette[i % fnt.syntaxPalette.length] : th.textColor),
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
                        fontSize: scaleSize("clamp(18px, 2vw, 25px)", bs),
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
                  fontSize: scaleSize("clamp(14px, 1.4vw, 18px)", bs),
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
      {timing ? (
        <MeetingTimeline
          agenda={template.agenda}
          items={timing.items}
          currentIndex={currentIndex}
          intoItemSec={elapsedSec - itemStartElapsedSec}
          theme={th}
        />
      ) : (
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
      )}
    </div>
  );
}
