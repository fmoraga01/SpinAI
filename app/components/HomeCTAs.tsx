"use client";

import { useEffect, useState } from "react";
import { useDrawer } from "./DrawerContext";
import { loadData } from "@/lib/storage";
import { Assignment } from "@/lib/types";

function getNextAssignment(assignments: Assignment[]): Assignment | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = assignments
    .filter((a) => new Date(a.date + "T12:00:00") >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

export default function HomeCTAs() {
  const { openDrawer, openPrepare, drawer } = useDrawer();
  const [next, setNext] = useState<Assignment | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadData().then(({ assignments, members }) => {
      const memberIds = new Set(members.map((m) => m.id));
      const valid = assignments.filter((a) => a.memberId && memberIds.has(a.memberId));
      setNext(getNextAssignment(valid));
      setMounted(true);
    });
  }, [drawer]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => openDrawer("historial")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 24px",
          borderRadius: "var(--radius-md)",
          fontSize: 15,
          fontWeight: 500,
          color: "#fff",
          background: "var(--color-primary)",
          border: "1px solid var(--color-primary)",
          boxShadow: "var(--shadow-glow)",
          cursor: "pointer",
          transition: "opacity 150ms ease",
        }}
      >
        Asignados
        <span style={{ fontSize: 18 }}>↗</span>
      </button>

      {mounted && next && (
        <button
          onClick={() => openPrepare(next)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            borderRadius: "var(--radius-md)",
            fontSize: 15,
            fontWeight: 500,
            color: "var(--color-primary)",
            background: "transparent",
            border: "1px solid var(--color-primary)",
            cursor: "pointer",
            transition: "background 150ms ease, color 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#2C40FF15";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          ◈ Preparar lámina · {next.memberName}
        </button>
      )}
    </div>
  );
}
