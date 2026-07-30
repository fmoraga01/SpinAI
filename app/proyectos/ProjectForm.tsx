"use client";

import { useEffect, useRef, useState } from "react";
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

// Mismo patrón que MemberSelect (app/components/TemplateEditor.tsx): botón +
// lista de opciones propia, en vez de un <select> nativo (cuyo menú desplegado
// no se puede restylear en ningún navegador).
function statusOptionStyle(selected: boolean, isLast: boolean): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "7px 10px",
    fontSize: 12,
    cursor: "pointer",
    background: selected ? "#2C40FF12" : "transparent",
    color: selected ? "var(--color-primary)" : "var(--color-text-primary)",
    border: "none",
    borderBottom: isLast ? "none" : "1px solid var(--color-border)",
  };
}

function StatusSelect({ value, onChange }: { value: ProjectStatus; onChange: (status: ProjectStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          background: "var(--color-surface-elevated)",
          border: `1px solid ${open ? "var(--color-primary)" : "var(--color-border)"}`,
          borderRadius: "var(--radius-md)",
          padding: "8px 12px",
          fontSize: 13,
          color: "var(--color-text-primary)",
          cursor: "pointer",
          transition: "border-color 150ms",
        }}
      >
        <span>{PROJECT_STATUS_LABELS[value]}</span>
        <span
          style={{
            fontSize: 9,
            color: "#6B7280",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 150ms",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            maxHeight: 180,
            overflowY: "auto",
          }}
        >
          {PROJECT_STATUS_OPTIONS.map(([status, label], i) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                onChange(status);
                setOpen(false);
              }}
              style={statusOptionStyle(value === status, i === PROJECT_STATUS_OPTIONS.length - 1)}
              onMouseEnter={(e) => {
                if (value !== status) e.currentTarget.style.background = "var(--color-surface)";
              }}
              onMouseLeave={(e) => {
                if (value !== status) e.currentTarget.style.background = "transparent";
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
        <StatusSelect value={values.status} onChange={(status) => setValues((v) => ({ ...v, status }))} />
      </Field>
      <Field label="Resumen">
        <textarea
          value={values.summary}
          onChange={(e) => setValues((v) => ({ ...v, summary: e.target.value }))}
          placeholder="Resumen de la iniciativa"
          rows={10}
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
            transition: "background 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-border)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
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
            transition: "box-shadow 150ms ease",
          }}
          onMouseEnter={(e) => { if (canSubmit && !submitting) e.currentTarget.style.boxShadow = "var(--shadow-glow)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = canSubmit && !submitting ? "var(--shadow-glow-sm)" : "none"; }}
        >
          {submitting ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
