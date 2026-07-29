"use client";

import { useEffect, useState } from "react";
import { loadProject, healthFromTimeline } from "@/lib/projects";
import { Project } from "@/lib/types";
import HealthBadge from "./HealthBadge";
import ProjectTimeline from "./ProjectTimeline";

export default function ProjectDrawer({ projectId, onClose }: { projectId: string | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (projectId) {
      const raf = requestAnimationFrame(() => {
        setMounted(true);
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    }
    const raf = requestAnimationFrame(() => setVisible(false));
    const t = setTimeout(() => {
      setMounted(false);
      setProject(null);
      setError(false);
    }, 320);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    requestAnimationFrame(() => {
      setLoading(true);
      setError(false);
    });
    loadProject(projectId)
      .then(setProject)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  const headerTitle = loading ? "Cargando…" : project?.name ?? "Proyecto";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
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
            gap: 12,
            padding: "16px 24px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {headerTitle}
            </h2>
            {!loading && !error && project !== null && (
              <HealthBadge status={healthFromTimeline(project.updates)} />
            )}
          </div>
          <button
            onClick={onClose}
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
              flexShrink: 0,
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
          {loading && (
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
          )}

          {!loading && (error || project === null) && (
            <div
              style={{
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
                padding: "32px 20px",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
                {error ? "No se pudo cargar el proyecto" : "Proyecto no encontrado"}
              </p>
              <p style={{ fontSize: 13, color: "#4B5563", margin: 0, lineHeight: "20px" }}>
                {error ? "Intenta de nuevo más tarde." : "Puede que se haya eliminado o el enlace esté roto."}
              </p>
            </div>
          )}

          {!loading && !error && project !== null && (
            <>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-primary)", margin: "0 0 8px" }}>
                Resumen de la iniciativa
              </p>
              <p style={{ fontSize: 14.5, color: "var(--color-text-secondary)", lineHeight: "22px", margin: "0 0 16px" }}>
                {project.summary}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
                <span style={{ fontSize: 13, color: "var(--color-tertiary)" }}>País: {project.country}</span>
                <span style={{ fontSize: 13, color: "var(--color-tertiary)" }}>·</span>
                <span style={{ fontSize: 13, color: "var(--color-tertiary)" }}>Negocio: {project.businessUnit}</span>
              </div>

              <section>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-primary)", margin: "0 0 16px" }}>
                  Avance semanal
                </p>
                <ProjectTimeline updates={project.updates} />
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
