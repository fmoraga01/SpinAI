"use client";

import { mondayOf } from "@/lib/projects";
import { weekLabel } from "./ProjectTimeline";

export interface WeeklyUpdateValues {
  date: string; // valor crudo del <input type="date">, "" si vacío
  note: string;
}

interface Props {
  values: WeeklyUpdateValues;
  onChange: (patch: Partial<WeeklyUpdateValues>) => void;
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
  onFocus: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
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

export default function WeeklyUpdateFields({ values, onChange }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Fecha">
        <input
          type="date"
          value={values.date}
          onChange={(e) => onChange({ date: e.target.value })}
          style={inputStyle}
          {...focusHandlers()}
        />
        {values.date !== "" && (
          <p style={{ fontSize: 12, color: "var(--color-tertiary)", margin: 0 }}>
            Semana del {weekLabel(mondayOf(values.date))}
          </p>
        )}
      </Field>
      <Field label="Nota">
        <textarea
          value={values.note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Qué pasó esta semana"
          rows={4}
          style={{ ...inputStyle, resize: "vertical", lineHeight: "20px" }}
          {...focusHandlers()}
        />
      </Field>
    </div>
  );
}
