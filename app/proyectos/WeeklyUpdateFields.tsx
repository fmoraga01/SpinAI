"use client";

import { mondayOf } from "@/lib/projects";
import { weekLabel } from "./ProjectTimeline";
import FormattableTextarea from "./FormattableTextarea";
import { inputStyle, focusHandlers } from "./formStyles";

export interface WeeklyUpdateValues {
  date: string; // valor crudo del <input type="date">, "" si vacío
  note: string;
}

interface Props {
  values: WeeklyUpdateValues;
  onChange: (patch: Partial<WeeklyUpdateValues>) => void;
  noteRows?: number;
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

export default function WeeklyUpdateFields({ values, onChange, noteRows = 7 }: Props) {
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
        <FormattableTextarea
          value={values.note}
          onChange={(next) => onChange({ note: next })}
          placeholder="Qué pasó esta semana"
          rows={noteRows}
        />
      </Field>
    </div>
  );
}
