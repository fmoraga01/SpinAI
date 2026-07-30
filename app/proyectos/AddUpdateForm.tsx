"use client";

import { useState } from "react";
import { mondayOf, WeeklyUpdateFormValues } from "@/lib/projects";
import WeeklyUpdateFields, { WeeklyUpdateValues } from "./WeeklyUpdateFields";

interface Props {
  onSubmit: (values: WeeklyUpdateFormValues) => Promise<void>;
  onCancel: () => void;
  error: string | null;
}

export default function AddUpdateForm({ onSubmit, onCancel, error }: Props) {
  const [values, setValues] = useState<WeeklyUpdateValues>({ date: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  const isValid = values.date !== "" && values.note.trim() !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ weekOf: mondayOf(values.date), note: values.note.trim() });
    } catch {
      // El mensaje de error lo controla ProjectDrawer vía el prop `error` (R12).
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "var(--color-surface-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: 16,
        marginBottom: 20,
      }}
    >
      <WeeklyUpdateFields values={values} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} noteRows={11} />

      {error && (
        <p style={{ fontSize: 13, color: "#F87171", margin: 0 }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            background: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-border)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!isValid || submitting}
          style={{
            flex: 1,
            background: isValid && !submitting ? "var(--color-primary)" : "#1a2035",
            color: "var(--color-text-primary)",
            border: "1px solid " + (isValid && !submitting ? "var(--color-primary)" : "var(--color-border)"),
            borderRadius: "var(--radius-md)",
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 500,
            cursor: isValid && !submitting ? "pointer" : "not-allowed",
            boxShadow: isValid && !submitting ? "var(--shadow-glow-sm)" : "none",
            transition: "box-shadow 150ms ease",
          }}
          onMouseEnter={(e) => { if (isValid && !submitting) e.currentTarget.style.boxShadow = "var(--shadow-glow)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = isValid && !submitting ? "var(--shadow-glow-sm)" : "none"; }}
        >
          {submitting ? "Guardando…" : "Agregar"}
        </button>
      </div>
    </form>
  );
}
