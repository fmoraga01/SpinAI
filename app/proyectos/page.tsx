"use client";

import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { loadProjects } from "@/lib/projects";
import { Project } from "@/lib/types";
import ProjectCard from "./ProjectCard";
import ProjectDrawer from "./ProjectDrawer";
import CreateProjectCard from "./CreateProjectCard";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects()
      .then(setProjects)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  function handleSelectProject(id: string) {
    setCreating(false);
    setSelectedId(id);
  }

  function handleOpenCreate() {
    setSelectedId(null);
    setCreating(true);
  }

  function handleCloseDrawer() {
    setSelectedId(null);
    setCreating(false);
  }

  function handleCreated(project: Project) {
    setProjects((prev) => [...prev, project]);
  }

  function handleUpdated(project: Project) {
    setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
  }

  function handleDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

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

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CreateProjectCard onClick={handleOpenCreate} />
            {projects.map((p) => <ProjectCard key={p.id} project={p} onSelect={handleSelectProject} />)}
          </div>
        )}
      </div>

      <ProjectDrawer
        projectId={selectedId}
        mode={creating ? "create" : "view"}
        onClose={handleCloseDrawer}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
