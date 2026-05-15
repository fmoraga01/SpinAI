"use client";

import { useEffect, useState } from "react";
import { useDrawer } from "./DrawerContext";
import { AppData } from "@/lib/types";
import {
  loadData,
  addMember,
  toggleMember,
  removeMember,
  addAssignment,
  removeAssignment,
  confirmBulkAssignment,
  BulkAssignmentPreview,
} from "@/lib/storage";
import MembersPanel from "./MembersPanel";
import Roulette from "./Roulette";
import Schedule from "./Schedule";

const TITLES: Record<string, string> = {
  equipo: "Equipo",
  ruleta: "Ruleta de Turno",
  historial: "Calendario de asignados",
};

export default function Drawer() {
  const { drawer, closeDrawer } = useDrawer();
  const [data, setData] = useState<AppData>({ members: [], assignments: [] });
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // Animate in/out
  useEffect(() => {
    if (drawer) {
      setMounted(true);
      // Small delay so CSS transition fires
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 320);
      return () => clearTimeout(t);
    }
  }, [drawer]);

  // Load data whenever drawer opens
  useEffect(() => {
    if (drawer) setData(loadData());
  }, [drawer]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDrawer]);

  function refresh() {
    setData(loadData());
  }

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          width: "min(520px, 100vw)",
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 320ms cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--color-primary)", fontSize: 16 }}>◎</span>
            <h2
              className="text-sm font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {drawer ? TITLES[drawer] : ""}
            </h2>
          </div>
          <button
            onClick={closeDrawer}
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              transition: "border-color 150ms, color 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#F87171";
              e.currentTarget.style.color = "#F87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {drawer === "equipo" && (
            <MembersPanel
              members={data.members}
              onAdd={(name) => { addMember(name); refresh(); }}
              onToggle={(id) => { toggleMember(id); refresh(); }}
              onRemove={(id) => { removeMember(id); refresh(); }}
            />
          )}
          {drawer === "ruleta" && (
            <Roulette
              members={data.members}
              onAssignAll={(previews: BulkAssignmentPreview[]) => {
                confirmBulkAssignment(previews);
                refresh();
              }}
            />
          )}
          {drawer === "historial" && (
            <Schedule
              assignments={data.assignments}
              onRemove={(id) => { removeAssignment(id); refresh(); }}
            />
          )}
        </div>
      </div>
    </>
  );
}
