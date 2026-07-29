"use client";

import { useState } from "react";
import { ProjectStatus } from "@/lib/types";
import { mondayOf, ProjectFormValues, WeeklyUpdateFormValues } from "@/lib/projects";
import { PROJECT_STATUS_LABELS } from "./StatusBadge";
import WeeklyUpdateFields, { WeeklyUpdateValues } from "./WeeklyUpdateFields";

interface Props {
  initialValues: ProjectFormValues;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues, firstUpdate: WeeklyUpdateFormValues | null) => Promise<void>;
  onCancel: () => void;
  error: string | null;
  showFirstUpdateSection: boolean; // true solo en modo creación (project === null en ProjectDrawer)
}

const inputStyle: React.CSSProperties = {
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
  color: "var(--color-text-primary)",
  fontSize: 13,
  transition: "border-color 150ms ease",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

// Mismo lenguaje visual que MemberSelect (app/components/TemplateEditor.tsx):
// se apaga la flecha nativa del navegador y se dibuja una propia (▾) para que
// el <select> deje de verse con el estilo default del sistema.
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  paddingRight: 30,
  cursor: "pointer",
};

const selectArrowStyle: React.CSSProperties = {
  position: "absolute",
  right: 12,
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: 9,
  color: "#6B7280",
  pointerEvents: "none",
};

function focusHandlers(): {
  onFocus: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
} {
  return {
    onFocus: (e) => (e.currentTarget.style.borderColor = "#2C40FF"),
    onBlur: (e) => (e.currentTarget.style.borderColor = "var(--color-border)"),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: "var(--color-tertiary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS) as [ProjectStatus, string][];

export default function ProjectForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  error,
  showFirstUpdateSection,
}: Props) {
  const [values, setValues] = useState<ProjectFormValues>(initialValues);
  const [update, setUpdate] = useState<WeeklyUpdateValues>({ date: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  const isValid =
    values.name.trim() && values.country.trim() && values.businessUnit.trim() && values.summary.trim() && values.status;

  const updateFieldsFilled = [update.date, update.note].filter((v) => v !== "").length;
  const updateIsPartial = updateFieldsFilled > 0 && updateFieldsFilled < 2;
  const canSubmit = isValid && !updateIsPartial;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const firstUpdate: WeeklyUpdateFormValues | null =
      updateFieldsFilled === 2
        ? { weekOf: mondayOf(update.date), note: update.note.trim() }
        : null;
    try {
      await onSubmit(values, firstUpdate);
    } catch {
      // El mensaje de error lo controla ProjectDrawer vía el prop `error` (R5/R10).
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Nombre">
        <input
          type="text"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="Nombre del proyecto"
          style={inputStyle}
          {...focusHandlers()}
        />
      </Field>
      <Field label="País">
        <input
          type="text"
          value={values.country}
          onChange={(e) => setValues((v) => ({ ...v, country: e.target.value }))}
          placeholder="País"
          style={inputStyle}
          {...focusHandlers()}
        />
      </Field>
      <Field label="Unidad de negocio">
        <input
          type="text"
          value={values.businessUnit}
          onChange={(e) => setValues((v) => ({ ...v, businessUnit: e.target.value }))}
          placeholder="Unidad de negocio"
          style={inputStyle}
          {...focusHandlers()}
        />
      </Field>
      <Field label="Estado">
        <div style={{ position: "relative" }}>
          <select
            value={values.status}
            onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as ProjectStatus }))}
            style={selectStyle}
            {...focusHandlers()}
          >
            {PROJECT_STATUS_OPTIONS.map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
          <span style={selectArrowStyle}>▾</span>
        </div>
      </Field>
      <Field label="Resumen">
        <textarea
          value={values.summary}
          onChange={(e) => setValues((v) => ({ ...v, summary: e.target.value }))}
          placeholder="Resumen de la iniciativa"
          rows={4}
          style={{ ...inputStyle, resize: "vertical", lineHeight: "20px" }}
          {...focusHandlers()}
        />
      </Field>

      {showFirstUpdateSection && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4, borderTop: "1px solid var(--color-border)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-primary)", margin: "12px 0 0" }}>
            Primer avance semanal (opcional)
          </p>
          <WeeklyUpdateFields values={update} onChange={(patch) => setUpdate((v) => ({ ...v, ...patch }))} />
          {updateIsPartial && (
            <p style={{ fontSize: 12, color: "var(--color-tertiary)", margin: 0 }}>
              Completa fecha y nota para agregar el primer avance, o deja ambos vacíos.
            </p>
          )}
        </div>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "#F87171", margin: 0 }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
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
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          style={{
            flex: 1,
            background: canSubmit && !submitting ? "var(--color-primary)" : "#1a2035",
            color: "var(--color-text-primary)",
            border: "1px solid " + (canSubmit && !submitting ? "var(--color-primary)" : "var(--color-border)"),
            borderRadius: "var(--radius-md)",
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 500,
            cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
            boxShadow: canSubmit && !submitting ? "var(--shadow-glow-sm)" : "none",
          }}
        >
          {submitting ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
