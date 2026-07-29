"use client";

import { useEffect } from "react";

interface Props {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
  error: string | null;
}

export default function DeleteProjectModal({ projectName, onConfirm, onCancel, deleting, error }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "rgba(0,0,0,0.6)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 61,
          width: "min(420px, calc(100vw - 32px))",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 8px" }}>
          {`¿Eliminar "${projectName}"?`}
        </p>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: "20px", margin: "0 0 20px" }}>
          Esto también borrará sus KPIs y avances semanales.
        </p>

        {error && (
          <p style={{ fontSize: 13, color: "#F87171", margin: "0 0 16px" }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            style={{
              flex: 1,
              background: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 500,
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1,
              background: "#F8717122",
              color: "#F87171",
              border: "1px solid #F87171",
              borderRadius: "var(--radius-md)",
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </>
  );
}
