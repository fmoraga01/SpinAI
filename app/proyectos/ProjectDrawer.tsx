"use client";

import { useEffect, useState } from "react";
import {
  loadProject,
  healthFromTimeline,
  createProject,
  updateProject,
  deleteProject,
  createWeeklyUpdate,
  ProjectFormValues,
  WeeklyUpdateFormValues,
} from "@/lib/projects";
import { Project } from "@/lib/types";
import HealthBadge from "./HealthBadge";
import ProjectTimeline from "./ProjectTimeline";
import ProjectForm from "./ProjectForm";
import DeleteProjectModal from "./DeleteProjectModal";
import AddUpdateForm from "./AddUpdateForm";

interface Props {
  projectId: string | null;
  mode: "view" | "create";
  onClose: () => void;
  onCreated: (project: Project) => void;
  onUpdated: (project: Project) => void;
  onDeleted: (id: string) => void;
}

export default function ProjectDrawer({ projectId, mode, onClose, onCreated, onUpdated, onDeleted }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [formMode, setFormMode] = useState<"view" | "form">("view");
  const [formError, setFormError] = useState<string | null>(null);
  const [firstUpdateError, setFirstUpdateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingUpdate, setAddingUpdate] = useState(false);
  const [addUpdateError, setAddUpdateError] = useState<string | null>(null);

  const isOpen = projectId !== null || mode === "create";

  // Abre/cierra el panel (animación) según haya un proyecto seleccionado o
  // se esté creando uno nuevo.
  useEffect(() => {
    if (isOpen) {
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
      setFormMode("view");
      setFormError(null);
      setFirstUpdateError(null);
      setDeleteError(null);
      setShowDeleteModal(false);
      setAddingUpdate(false);
      setAddUpdateError(null);
    }, 320);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [isOpen]);

  // Carga el proyecto existente (modo vista/edición) o arranca el formulario
  // vacío (modo creación) — nunca hace fetch cuando `projectId` es null.
  useEffect(() => {
    if (!projectId) {
      if (mode !== "create") return;
      const raf = requestAnimationFrame(() => {
        setProject(null);
        setFormMode("form");
        setFormError(null);
        setDeleteError(null);
      });
      return () => cancelAnimationFrame(raf);
    }

    const raf = requestAnimationFrame(() => {
      setFormMode("view");
      setFormError(null);
      setDeleteError(null);
      setLoading(true);
      setError(false);
    });
    loadProject(projectId)
      .then(setProject)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    return () => cancelAnimationFrame(raf);
  }, [projectId, mode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Mientras el modal de borrado está abierto, Escape lo cierra a él
      // primero, no al drawer de fondo (un nivel de overlay a la vez).
      if (showDeleteModal) return;
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, showDeleteModal]);

  if (!mounted) return null;

  async function handleFormSubmit(values: ProjectFormValues, firstUpdate: WeeklyUpdateFormValues | null) {
    setFormError(null);
    setFirstUpdateError(null);
    try {
      if (project === null) {
        const created = await createProject(values); // R5: si esto falla, el catch de abajo maneja todo, firstUpdate ni se intenta
        setProject(created);
        onCreated(created);
        setFormMode("view");
        if (firstUpdate) {
          try {
            const update = await createWeeklyUpdate(created.id, firstUpdate);
            const withUpdate = { ...created, updates: [...created.updates, update] };
            setProject(withUpdate);
            onUpdated(withUpdate);
          } catch (e) {
            // R6: el proyecto ya se creó y se queda — solo se informa que el avance no se guardó.
            setFirstUpdateError(e instanceof Error ? e.message : "El proyecto se creó, pero no se pudo guardar el primer avance");
          }
        }
      } else {
        const updated = await updateProject(project.id, values);
        setProject(updated);
        onUpdated(updated);
        setFormMode("view");
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Ocurrió un error inesperado");
    }
  }

  async function handleAddUpdate(values: WeeklyUpdateFormValues) {
    if (!project) return;
    setAddUpdateError(null);
    try {
      const update = await createWeeklyUpdate(project.id, values);
      const withUpdate = { ...project, updates: [...project.updates, update] };
      setProject(withUpdate);
      onUpdated(withUpdate);
      setAddingUpdate(false);
    } catch (e) {
      setAddUpdateError(e instanceof Error ? e.message : "No se pudo guardar el avance"); // R12
    }
  }

  function handleFormCancel() {
    setFormError(null);
    // Nada guardado todavía (recién abierto en modo creación): cierra el
    // drawer entero, no hay un "modo vista" al que volver (R9).
    if (project === null) {
      onClose();
    } else {
      setFormMode("view");
    }
  }

  async function handleDeleteConfirm() {
    if (!project) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      onDeleted(project.id);
      setShowDeleteModal(false);
      onClose();
    } catch (e) {
      // R15: cerrar el modal, mostrar el error dentro del drawer, mantener
      // el proyecto en el listado (no se llama a onDeleted).
      setShowDeleteModal(false);
      setDeleteError(e instanceof Error ? e.message : "Ocurrió un error inesperado");
    } finally {
      setDeleting(false);
    }
  }

  const headerTitle = loading
    ? "Cargando…"
    : project?.name ?? (mode === "create" ? "Crear proyecto" : "Proyecto");

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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {!loading && !error && project !== null && formMode === "view" && (
              <>
                <button
                  onClick={() => { setFormError(null); setFormMode("form"); }}
                  style={{
                    height: 32,
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    background: "transparent",
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "0 12px",
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
                  Editar
                </button>
                <button
                  onClick={() => { setDeleteError(null); setShowDeleteModal(true); }}
                  style={{
                    height: 32,
                    borderRadius: "var(--radius-md)",
                    border: "1px solid #F87171",
                    background: "transparent",
                    color: "#F87171",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "0 12px",
                    transition: "border-color 150ms, background 150ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F8717122"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Eliminar
                </button>
              </>
            )}
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
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {formMode === "form" && (
            <ProjectForm
              initialValues={{
                name: project?.name ?? "",
                country: project?.country ?? "",
                businessUnit: project?.businessUnit ?? "",
                summary: project?.summary ?? "",
              }}
              submitLabel={project === null ? "Crear proyecto" : "Guardar cambios"}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              error={formError}
              showFirstUpdateSection={project === null}
            />
          )}

          {formMode === "view" && loading && (
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

          {formMode === "view" && !loading && (error || project === null) && (
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

          {formMode === "view" && !loading && !error && project !== null && (
            <>
              {deleteError && (
                <p style={{ fontSize: 13, color: "#F87171", margin: "0 0 16px" }}>{deleteError}</p>
              )}
              {firstUpdateError && (
                <p style={{ fontSize: 13, color: "#F87171", margin: "0 0 16px" }}>{firstUpdateError}</p>
              )}
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-primary)", margin: 0 }}>
                    Avance semanal
                  </p>
                  {!addingUpdate && (
                    <button
                      onClick={() => { setAddUpdateError(null); setAddingUpdate(true); }}
                      style={{
                        height: 28,
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)",
                        background: "transparent",
                        color: "var(--color-text-secondary)",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "0 10px",
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
                      Agregar avance
                    </button>
                  )}
                </div>
                {addingUpdate && (
                  <AddUpdateForm
                    onSubmit={handleAddUpdate}
                    onCancel={() => { setAddingUpdate(false); setAddUpdateError(null); }}
                    error={addUpdateError}
                  />
                )}
                <ProjectTimeline updates={project.updates} />
              </section>
            </>
          )}
        </div>
      </div>

      {showDeleteModal && project !== null && (
        <DeleteProjectModal
          projectName={project.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          deleting={deleting}
        />
      )}
    </>
  );
}
