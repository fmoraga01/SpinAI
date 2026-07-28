"use client";

import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { loadProjects } from "@/lib/projects";
import { Project } from "@/lib/types";
import ProjectCard from "./ProjectCard";

function ProjectCardSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 18,
        background: "var(--color-surface-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="animate-pulse" style={{ width: "70%", height: 18, borderRadius: 4, background: "var(--color-border)" }} />
      <div className="animate-pulse" style={{ width: "40%", height: 12, borderRadius: 4, background: "var(--color-border)" }} />
      <div className="animate-pulse" style={{ width: "55%", height: 11, borderRadius: 4, background: "var(--color-border)" }} />
    </div>
  );
}

export default function ProyectosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadProjects()
      .then(setProjects)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <Nav />
      <div className="max-w-4xl mx-auto px-6" style={{ paddingTop: 48, paddingBottom: 64 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>
          Status de Proyectos
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-tertiary)", marginBottom: 28 }}>
          Avance de las iniciativas internas en curso, con su estado de salud más reciente.
        </p>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--color-tertiary)", fontSize: 14 }}>
            No se pudieron cargar los proyectos en este momento. Intenta de nuevo más tarde.
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "56px 24px", gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: "var(--radius-md)",
              background: "#2C40FF0f", border: "1px solid #2C40FF22",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2C40FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h11l5 5v11H4z" />
                <path d="M9 9h6M9 13h6M9 17h3" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Sin proyectos cargados</p>
              <p style={{ fontSize: 13, color: "#4B5563", margin: 0, maxWidth: 260, lineHeight: "20px" }}>
                Todavía no hay proyectos registrados. Vuelve a revisar más tarde.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
