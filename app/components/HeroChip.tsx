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
    .filter((a) => a.memberId && new Date(a.date + "T12:00:00") >= today && memberIds.has(a.memberId))
    .sort((a, b) => a.date.localeCompare(b.date));

  return upcoming[0] ?? null;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export default function HeroChip() {
  const { drawer } = useDrawer();
  const [assignment, setAssignment] = useState<{ id: string; memberName: string | null; date: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    getNextFridayAssignment().then((a) => { setAssignment(a); setMounted(true); });
  }, [drawer]);

  if (!mounted || !assignment) return null;

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
      {`Próximo viernes · ${assignment.memberName} · ${formatShortDate(assignment.date)}`}
    </span>
  );
}
