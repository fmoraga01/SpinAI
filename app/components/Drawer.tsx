"use client";

import { useEffect, useState } from "react";
import { useDrawer } from "./DrawerContext";
import { AppData } from "@/lib/types";
import {
  loadData,
  addMember,
  toggleMember,
  removeMember,
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (drawer) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 320);
      return () => clearTimeout(t);
    }
  }, [drawer]);

  useEffect(() => {
    if (!drawer) return;
    setLoading(true);
    loadData().then((d) => { setData(d); setLoading(false); });
  }, [drawer]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDrawer]);

  async function refresh() {
    const d = await loadData();
    setData(d);
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
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                style={{
                  width: 20, height: 20,
                  border: "2px solid var(--color-border)",
                  borderTopColor: "var(--color-primary)",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              {drawer === "equipo" && (
                <MembersPanel
                  members={data.members}
                  onAdd={async (name) => { await addMember(name); await refresh(); }}
                  onToggle={async (id) => { await toggleMember(id); await refresh(); }}
                  onRemove={async (id) => { await removeMember(id); await refresh(); }}
                />
              )}
              {drawer === "ruleta" && (
                <Roulette
                  members={data.members}
                  onAssignAll={async (previews: BulkAssignmentPreview[]) => {
                    await confirmBulkAssignment(previews);
                    await refresh();
                  }}
                />
              )}
              {drawer === "historial" && (
                <Schedule
                  assignments={data.assignments}
                  onRemove={async (id) => { await removeAssignment(id); await refresh(); }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
