"use client";

import { useEffect, useState } from "react";
import { loadData } from "@/lib/storage";
import { useDrawer } from "./DrawerContext";

async function getNextFridayAssignment() {
  const { assignments, members } = await loadData();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const memberIds = new Set(members.map((m) => m.id));

  const upcoming = assignments
    .filter((a) => new Date(a.date + "T12:00:00") >= today && memberIds.has(a.memberId))
    .sort((a, b) => a.date.localeCompare(b.date));

  return upcoming[0] ?? null;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export default function HeroChip() {
  const { drawer } = useDrawer();
  const [assignment, setAssignment] = useState<{ id: string; memberName: string; date: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [notifyState, setNotifyState] = useState<"idle" | "sending" | "ok" | "no_email" | "error">("idle");

  useEffect(() => {
    getNextFridayAssignment().then((a) => { setAssignment(a); setMounted(true); });
  }, [drawer]);

  async function handleNotify() {
    if (!assignment) return;
    setNotifyState("sending");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: assignment.id }),
      });
      if (res.status === 422) setNotifyState("no_email");
      else if (!res.ok) setNotifyState("error");
      else setNotifyState("ok");
    } catch {
      setNotifyState("error");
    }
    setTimeout(() => setNotifyState("idle"), 4000);
  }

  if (!mounted || !assignment) return null;

  const notifyLabel =
    notifyState === "sending" ? "Enviando…" :
    notifyState === "ok" ? "✓ Enviado" :
    notifyState === "no_email" ? "⚠ Sin email" :
    notifyState === "error" ? "✕ Error" :
    "✉ Notificar";

  const notifyColor =
    notifyState === "ok" ? "#6EE7B7" :
    notifyState === "no_email" ? "#FCD34D" :
    notifyState === "error" ? "#FCA5A5" :
    "#4B5563";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 500,
          color: "var(--color-primary)",
          background: "#2C40FF15",
          border: "1px solid #2C40FF33",
          borderRadius: "var(--radius-md)",
          padding: "4px 12px",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--color-primary)",
            boxShadow: "var(--shadow-glow-sm)",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        {`Próximo viernes · ${assignment.memberName} · ${formatShortDate(assignment.date)}`}
      </span>

      <button
        onClick={handleNotify}
        disabled={notifyState === "sending"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 500,
          color: notifyColor,
          background: "transparent",
          border: "1px solid " + (notifyState === "idle" ? "#1f2333" : notifyColor + "55"),
          borderRadius: "var(--radius-md)",
          padding: "4px 10px",
          cursor: notifyState === "sending" ? "wait" : "pointer",
          transition: "border-color 150ms, color 150ms",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          if (notifyState === "idle") {
            e.currentTarget.style.borderColor = "var(--color-primary)";
            e.currentTarget.style.color = "var(--color-primary)";
          }
        }}
        onMouseLeave={(e) => {
          if (notifyState === "idle") {
            e.currentTarget.style.borderColor = "#1f2333";
            e.currentTarget.style.color = "#4B5563";
          }
        }}
      >
        {notifyLabel}
      </button>
    </div>
  );
}
