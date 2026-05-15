"use client";

import { useDrawer } from "./DrawerContext";

export default function HomeCTAs() {
  const { openDrawer } = useDrawer();

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
        Ver calendario de asignados
        <span style={{ fontSize: 18 }}>↗</span>
      </button>
    </div>
  );
}
