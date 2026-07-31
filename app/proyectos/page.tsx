"use client";

import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { loadProjects, deleteProject } from "@/lib/projects";
import { Project } from "@/lib/types";
import ProjectCard from "./ProjectCard";
import ProjectDrawer from "./ProjectDrawer";
import CreateProjectCard from "./CreateProjectCard";
import DeleteProjectModal from "./DeleteProjectModal";
import { FEATURE_FLAGS } from "@/lib/featureFlags";

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
  const [editOnOpen, setEditOnOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects()
      .then(setProjects)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  function handleSelectProject(id: string) {
    setCreating(false);
    setEditOnOpen(false);
    setSelectedId(id);
  }

  function handleEditProject(id: string) {
    setCreating(false);
    setEditOnOpen(true);
    setSelectedId(id);
  }

  function handleOpenCreate() {
    setSelectedId(null);
    setEditOnOpen(false);
    setCreating(true);
  }

  function handleCloseDrawer() {
    setSelectedId(null);
    setCreating(false);
    setEditOnOpen(false);
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

  function handleRequestDelete(project: Project) {
    setDeleteModalError(null);
    setDeleteTarget(project);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProject(deleteTarget.id);
      handleDeleted(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e) {
      setDeleteModalError(e instanceof Error ? e.message : "No se pudo eliminar el proyecto");
    } finally {
      setDeleting(false);
    }
  }

  if (!FEATURE_FLAGS.proyectosStatusVisible) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
        <Nav />
        <div className="max-w-4xl mx-auto px-6" style={{ paddingTop: 96, paddingBottom: 64, textAlign: "center", color: "var(--color-tertiary)", fontSize: 14 }}>
          Esta sección no está disponible por el momento.
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <Nav />
      <div className="max-w-4xl mx-auto px-6" style={{ paddingTop: 48, paddingBottom: 64 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>
          Status de Proyectos
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-tertiary)", marginBottom: 28 }}>
          Avance semanal de las iniciativas.
        </p>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--color-tertiary)", fontSize: 14 }}>
            No se pudieron cargar los proyectos en este momento. Intenta de nuevo más tarde.
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "56px 24px 24px", gap: 16 }}>
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
                Crea el primero para empezar a hacer seguimiento.
              </p>
            </div>
            <div style={{ width: "100%", maxWidth: 280, marginTop: 8 }}>
              <CreateProjectCard onClick={handleOpenCreate} />
            </div>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <CreateProjectCard onClick={handleOpenCreate} />
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onSelect={handleSelectProject}
                onEdit={handleEditProject}
                onDelete={handleRequestDelete}
              />
            ))}
          </div>
        )}
      </div>

      <ProjectDrawer
        projectId={selectedId}
        mode={creating ? "create" : editOnOpen ? "edit" : "view"}
        onClose={handleCloseDrawer}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />

      {deleteTarget && (
        <DeleteProjectModal
          projectName={deleteTarget.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
          error={deleteModalError}
        />
      )}
    </div>
  );
}
