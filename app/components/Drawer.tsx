"use client";

import { useEffect, useState } from "react";
import { useDrawer } from "./DrawerContext";
import { AppData, Assignment } from "@/lib/types";
import {
  loadData,
  addMember,
  toggleMember,
  removeMember,
  updateMemberEmail,
  removeAssignment,
  confirmBulkAssignment,
  BulkAssignmentPreview,
} from "@/lib/storage";
import MembersPanel from "./MembersPanel";
import Roulette from "./Roulette";
import Schedule from "./Schedule";
import TemplateEditor from "./TemplateEditor";
import PresentationView from "./PresentationView";
import ChangeLog from "./ChangeLog";

const TITLES: Record<string, string> = {
  equipo: "Equipo",
  ruleta: "Ruleta de Turno",
  historial: "Calendario de asignados",
  log: "Log de cambios",
};

export default function Drawer() {
  const { drawer, openDrawer, closeDrawer, pendingPrepare, clearPendingPrepare } = useDrawer();
  const [data, setData] = useState<AppData>({ members: [], assignments: [] });
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [presentingTemplate, setPresentingTemplate] = useState<{ template: import("@/lib/types").Template; date: string } | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notifyState, setNotifyState] = useState<"idle" | "sending" | "ok" | "no_email" | "error">("idle");

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (drawer) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      setEditingAssignment(null);
      const t = setTimeout(() => setMounted(false), 320);
      return () => clearTimeout(t);
    }
  }, [drawer]);

  useEffect(() => {
    if (!drawer) return;
    setLoading(true);
    loadData().then((d) => {
      setData(d);
      setLoading(false);
      if (pendingPrepare) {
        // Find the fresh assignment from DB (same id) so data is up to date
        const match = d.assignments.find((a) => a.id === pendingPrepare.id) ?? pendingPrepare;
        setEditingAssignment(match);
        clearPendingPrepare();
      }
    });
  }, [drawer]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (editingAssignment) setEditingAssignment(null);
        else closeDrawer();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDrawer, editingAssignment]);

  async function refresh() {
    const d = await loadData();
    setData(d);
  }

  async function handleNotify(assignmentId: string) {
    setNotifyState("sending");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (res.status === 422) { setNotifyState("no_email"); }
      else if (!res.ok) { setNotifyState("error"); }
      else { setNotifyState("ok"); }
    } catch {
      setNotifyState("error");
    }
    setTimeout(() => setNotifyState("idle"), 4000);
  }

  const headerTitle = editingAssignment
    ? "Preparar lámina"
    : drawer ? TITLES[drawer] : "";

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
          width: isFullscreen ? "70vw" : "min(520px, 100vw)",
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
          <h2
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {headerTitle}
          </h2>
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
              e.currentTarget.style.borderColor = "var(--color-primary)";
              e.currentTarget.style.color = "var(--color-primary)";
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
          ) : editingAssignment ? (
            <TemplateEditor
              key={editorKey}
              assignment={editingAssignment}
              onBack={() => setEditingAssignment(null)}
              onPresent={(template) => setPresentingTemplate({ template, date: editingAssignment.date })}
            />
          ) : (
            <>
              {drawer === "equipo" && (
                <MembersPanel
                  members={data.members}
                  onAdd={async (name) => { await addMember(name); await refresh(); }}
                  onToggle={async (id) => { await toggleMember(id); await refresh(); }}
                  onRemove={async (id) => { await removeMember(id); await refresh(); }}
                  onUpdateEmail={async (id, email) => { await updateMemberEmail(id, email); await refresh(); }}
                />
              )}
              {drawer === "ruleta" && (
                <Roulette
                  members={data.members}
                  onAssignAll={async (previews: BulkAssignmentPreview[]) => {
                    await confirmBulkAssignment(previews);
                    await refresh();
                    openDrawer("historial");
                  }}
                />
              )}
              {drawer === "historial" && (
                <>
                  {notifyState !== "idle" && (
                    <div style={{
                      marginBottom: 12,
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      fontSize: 12,
                      fontWeight: 500,
                      background: notifyState === "ok" ? "#065F4622" : notifyState === "no_email" ? "#92400E22" : notifyState === "sending" ? "#2C40FF11" : "#7F1D1D22",
                      border: "1px solid " + (notifyState === "ok" ? "#065F46" : notifyState === "no_email" ? "#92400E" : notifyState === "sending" ? "#2C40FF44" : "#7F1D1D"),
                      color: notifyState === "ok" ? "#6EE7B7" : notifyState === "no_email" ? "#FCD34D" : notifyState === "sending" ? "var(--color-primary)" : "#FCA5A5",
                    }}>
                      {notifyState === "sending" && "Enviando notificación…"}
                      {notifyState === "ok" && "✓ Email enviado correctamente"}
                      {notifyState === "no_email" && "⚠ Este integrante no tiene email registrado"}
                      {notifyState === "error" && "✕ Error al enviar el email"}
                    </div>
                  )}
                  <Schedule
                    assignments={data.assignments}
                    onRemove={async (id) => { await removeAssignment(id); await refresh(); }}
                    onPrepare={(assignment) => setEditingAssignment(assignment)}
                    onRefresh={refresh}
                    onNotify={handleNotify}
                  />
                </>
              )}
              {drawer === "log" && <ChangeLog />}
            </>
          )}
        </div>
      </div>

      {/* Presentation — rendered outside the transformed panel so position:fixed works correctly */}
      {presentingTemplate && (
        <PresentationView
          template={presentingTemplate.template}
          date={presentingTemplate.date}
          onClose={() => { setPresentingTemplate(null); setEditorKey((k) => k + 1); }}
        />
      )}
    </>
  );
}
