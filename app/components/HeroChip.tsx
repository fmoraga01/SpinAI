"use client";

import { useEffect, useState } from "react";
import { loadData } from "@/lib/storage";

function getNextFridayAssignment() {
  const { assignments } = loadData();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = assignments
    .filter((a) => new Date(a.date + "T12:00:00") >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  return upcoming[0] ?? null;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export default function HeroChip() {
  const [assignment, setAssignment] = useState<{ memberName: string; date: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAssignment(getNextFridayAssignment());
    setMounted(true);
  }, []);

  return (
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
      {mounted && assignment
        ? `Próximo viernes · ${assignment.memberName} · ${formatShortDate(assignment.date)}`
        : "Reuniones de equipo · Viernes"}
    </span>
  );
}
