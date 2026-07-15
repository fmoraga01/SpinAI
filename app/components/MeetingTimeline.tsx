"use client";

import { useState } from "react";
import { AgendaTimingItem } from "@/lib/types";
import { ThemeConfig } from "@/lib/themes";

const OVER = "#EF4444";

interface Props {
  agenda: string[];
  items: AgendaTimingItem[];
  elapsedSec: number;
  theme: ThemeConfig;
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function locate(items: AgendaTimingItem[], elapsedSec: number): { index: number; intoItemSec: number; itemDurSec: number } {
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    const dur = items[i].minutes * 60;
    if (i === items.length - 1 || elapsedSec < acc + dur) {
      return { index: i, intoItemSec: elapsedSec - acc, itemDurSec: dur };
    }
    acc += dur;
  }
  return { index: 0, intoItemSec: 0, itemDurSec: (items[0]?.minutes ?? 0) * 60 };
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function MeetingTimeline({ agenda, items, elapsedSec, theme }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const totalMinutes = items.reduce((s, it) => s + it.minutes, 0);

  if (items.length === 0 || totalMinutes === 0) return null;

  const { index: currentIndex, intoItemSec, itemDurSec } = locate(items, elapsedSec);
  const overtimeSec = Math.max(0, intoItemSec - itemDurSec);
  const isOvertime = overtimeSec > 0;
  const remaining = isOvertime ? overtimeSec : Math.max(0, itemDurSec - intoItemSec);
  const isWarn = !isOvertime && itemDurSec > 0 && intoItemSec >= itemDurSec * 0.8;
  const current = items[currentIndex];

  return (
    <div
      role="group"
      aria-label="Línea de tiempo de la reunión"
      style={{
        position: "relative", zIndex: 1,
        padding: "12px 40px 14px",
        borderTop: `1px solid ${theme.cardBorder}`,
        flexShrink: 0,
      }}
    >
      <style>{`
        @keyframes spinai-timer-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .spinai-timer-pulse { animation: spinai-timer-pulse 1.4s ease-in-out infinite; }
      `}</style>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: theme.textColor }}>
          Ítem {currentIndex + 1} de {items.length}
          <span style={{ fontSize: 11, fontWeight: 500, color: theme.textSecondary, marginLeft: 8 }}>
            {current.memberName ?? "Sin responsable"} · {current.minutes} min asignados
          </span>
        </span>
        <span
          role="timer"
          className={isWarn ? "spinai-timer-pulse" : undefined}
          style={{
            fontSize: 18, fontWeight: 700, color: isOvertime ? OVER : theme.textColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {isOvertime ? "+" : ""}{fmt(remaining)}
        </span>
      </div>

      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 3, height: 8 }}>
          {items.map((item, i) => {
            const dur = item.minutes * 60;
            let fillPct = 0;
            let fillColor = theme.accent;
            let done = false;
            if (i < currentIndex) { fillPct = 100; done = true; fillColor = theme.textSecondary; }
            else if (i === currentIndex) {
              fillPct = isOvertime ? 100 : Math.min(100, (intoItemSec / dur) * 100);
              fillColor = isOvertime ? OVER : theme.accent;
            }
            return (
              <div
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
                title={`${agenda[i] ?? ""} — ${item.memberName ?? "Sin responsable"} — ${item.minutes} min`}
                style={{
                  flex: `${item.minutes} 0 0`, height: 8, borderRadius: 4,
                  background: "rgba(255,255,255,0.08)", position: "relative", overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute", inset: 0, width: `${fillPct}%`, borderRadius: 4,
                    background: fillColor, opacity: done ? 0.5 : 1, transition: "width 500ms linear",
                  }}
                />
              </div>
            );
          })}
        </div>

        {hovered !== null && (
          <div
            style={{
              position: "absolute", bottom: "100%", marginBottom: 8,
              left: `${((items.slice(0, hovered).reduce((s, it) => s + it.minutes, 0) + items[hovered].minutes / 2) / totalMinutes) * 100}%`,
              transform: "translateX(-50%)",
              background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 8,
              padding: "8px 10px", fontSize: 11, whiteSpace: "nowrap", zIndex: 5,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontWeight: 700, color: theme.textColor, marginBottom: 3 }}>{agenda[hovered]}</div>
            <div style={{ color: theme.textSecondary, display: "flex", gap: 12, justifyContent: "space-between" }}>
              <span>{items[hovered].memberName ?? "Sin responsable"}</span>
              <span>{items[hovered].minutes} min</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {items.map((item, i) => {
          const active = i === currentIndex;
          const done = i < currentIndex;
          return (
            <div key={i} style={{ flex: `${item.minutes} 0 0`, display: "flex", justifyContent: "center" }}>
              <div
                title={item.memberName ?? "Sin responsable"}
                style={{
                  width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700,
                  border: `1px solid ${active ? theme.accent : theme.cardBorder}`,
                  background: active ? `${theme.accent}22` : "transparent",
                  color: done ? theme.textSecondary : active ? theme.accent : theme.textSecondary,
                  opacity: done ? 0.55 : 1,
                }}
              >
                {item.memberName ? initials(item.memberName) : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
