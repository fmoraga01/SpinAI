"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Nav from "../../components/Nav";
import { loadProject, healthFromTimeline } from "@/lib/projects";
import { Project } from "@/lib/types";
import HealthBadge from "../HealthBadge";
import ProjectTimeline from "./ProjectTimeline";

const tileStyle: React.CSSProperties = {
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "18px 20px",
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadProject(id)
      .then(setProject)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <Nav />
      <div className="max-w-4xl mx-auto px-6" style={{ paddingTop: 48, paddingBottom: 64 }}>
        {loading && (
          <div className="animate-pulse" style={{ ...tileStyle, padding: "32px" }}>
            <div style={{ width: "50%", height: 24, borderRadius: 4, background: "var(--color-border)", marginBottom: 14 }} />
            <div style={{ width: "30%", height: 14, borderRadius: 4, background: "var(--color-border)" }} />
          </div>
        )}

        {!loading && (error || project === null) && (
          <div style={{ ...tileStyle, textAlign: "center", padding: "48px 24px" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
              {error ? "No se pudo cargar el proyecto" : "Proyecto no encontrado"}
            </p>
            <p style={{ fontSize: 13, color: "#4B5563", margin: 0, lineHeight: "20px" }}>
              {error
                ? "Intenta de nuevo más tarde."
                : "Revisa que el enlace sea correcto o vuelve al listado de proyectos."}
            </p>
          </div>
        )}

        {!loading && !error && project !== null && (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
              <h1 style={{ fontSize: 28, fontWeight: 600, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
                {project.name}
              </h1>
              <HealthBadge status={healthFromTimeline(project.updates)} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              <span style={{ fontSize: 13, color: "var(--color-tertiary)" }}>{project.country}</span>
              <span style={{ fontSize: 13, color: "var(--color-tertiary)" }}>·</span>
              <span style={{ fontSize: 13, color: "var(--color-tertiary)" }}>{project.businessUnit}</span>
            </div>
            <p style={{ fontSize: 14.5, color: "var(--color-text-secondary)", lineHeight: "22px", margin: "0 0 32px" }}>
              {project.summary}
            </p>

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
  );
}
