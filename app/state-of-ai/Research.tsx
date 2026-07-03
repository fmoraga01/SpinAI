"use client";

import { useEffect, useState } from "react";
import { ResearchPaper, loadResearchPapers } from "@/lib/research";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export default function Research() {
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadResearchPapers(8)
      .then(setPapers)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse" style={{ height: 64, borderRadius: "var(--radius-md)", background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }} />
        ))}
      </div>
    );
  }

  if (error || papers.length === 0) {
    return (
      <div style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--color-tertiary)", margin: 0 }}>
          {error ? "No se pudieron cargar los papers en este momento." : "Aún no hay papers cargados — el cron diario poblará esta sección."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {papers.map((p) => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", display: "block" }}
        >
          <div
            style={{
              background: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "14px 16px",
              transition: "border-color 150ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2C40FF44"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", margin: 0, lineHeight: "19px" }}>
                {p.title}
              </p>
              <span style={{ fontSize: 11, color: "#4B5563", flexShrink: 0, whiteSpace: "nowrap" }}>
                {formatDate(p.publishedAt)}
              </span>
            </div>
            {p.authors.length > 0 && (
              <p style={{ fontSize: 11.5, color: "var(--color-tertiary)", margin: "5px 0 0" }}>
                {p.authors.slice(0, 3).join(", ")}{p.authors.length > 3 ? ` +${p.authors.length - 3}` : ""}
              </p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
